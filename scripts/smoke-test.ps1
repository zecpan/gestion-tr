$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$tempDb = Join-Path $env:TEMP ("team-roquette-test-" + [guid]::NewGuid().ToString("N") + ".sqlite")
$stdout = Join-Path $env:TEMP ("tr-next-" + [guid]::NewGuid().ToString("N") + ".out")
$stderr = Join-Path $env:TEMP ("tr-next-" + [guid]::NewGuid().ToString("N") + ".err")
$port = 3187
$process = $null

try {
    $env:DATABASE_PATH = $tempDb
    $env:ADMIN_USERNAME = "admin-test"
    $password = "TestPassword-for-integration-2026!"
    $salt = "integration-salt"
    $hash = & node scripts/test-support.mjs hash $password $salt
    $env:ADMIN_PASSWORD_HASH = 'scrypt$' + $salt + '$' + $hash
    & node scripts/test-support.mjs legacy-db $tempDb
    if ($LASTEXITCODE -ne 0) { throw "La préparation de la base historique a échoué." }

    $process = Start-Process -FilePath "node" -ArgumentList @(
        "node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "$port"
    ) -WorkingDirectory (Get-Location).Path -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru

    $ready = $false
    for ($i = 0; $i -lt 40; $i++) {
        Start-Sleep -Milliseconds 500
        try {
            $response = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$port/" -TimeoutSec 2
            if ($response.StatusCode -eq 200) { $ready = $true; break }
        } catch { }
    }
    if (-not $ready) { throw "Next ne démarre pas. $((Get-Content $stderr -Raw -ErrorAction SilentlyContinue))" }

    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $unauthorizedStatus = 0
    try { Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/api/admin/seasons" | Out-Null }
    catch { $unauthorizedStatus = [int]$_.Exception.Response.StatusCode }
    if ($unauthorizedStatus -ne 401) { throw "Une API admin sans session doit répondre 401 (reçu $unauthorizedStatus)." }

    $crossOriginStatus = 0
    try {
        Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/api/admin/login" -Method Post -Headers @{ Origin = "http://evil.invalid" } -ContentType "application/json" -Body "{}" | Out-Null
    } catch { $crossOriginStatus = [int]$_.Exception.Response.StatusCode }
    if ($crossOriginStatus -ne 403) { throw "Une origine étrangère doit être rejetée (HTTP $crossOriginStatus)." }

    $loginBody = @{ username = $env:ADMIN_USERNAME; password = $password } | ConvertTo-Json -Compress
    try {
        $login = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/api/admin/login" -Method Post -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $loginBody -WebSession $session
    } catch {
        $status = [int]$_.Exception.Response.StatusCode
        $body = ""
        if ($_.Exception.Response) { $reader = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream()); $body = $reader.ReadToEnd(); $reader.Dispose() }
        throw "Connexion admin refusée (HTTP $status): $body"
    }
    if ($login.StatusCode -ne 200) { throw "Échec de connexion administrateur." }

    $seasonBody = @{ label = "2025-2026"; division = "Division test" } | ConvertTo-Json -Compress
    $created = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/seasons" -Method Post -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $seasonBody -WebSession $session
    if ($created.season.matchCount -ne 182) { throw "Le calendrier ne contient pas 182 matchs." }
    $seasonTeamBody = @{ name = "FC Formulaire" } | ConvertTo-Json -Compress
    $seasonTeam = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/seasons/$($created.season.id)/teams" -Method Post -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $seasonTeamBody -WebSession $session
    if ($seasonTeam.team.name -ne "FC Formulaire" -or $seasonTeam.alreadyAdded) { throw "L’équipe n’a pas été ajoutée à la saison." }
    $updatedBody = @{ label = "2025-2026"; division = "Division mise à jour" } | ConvertTo-Json -Compress
    $updated = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/seasons/$($created.season.id)" -Method Patch -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $updatedBody -WebSession $session
    if ($updated.season.division -ne "Division mise à jour") { throw "La modification d'une saison démarrée n'a pas été prise en compte." }

    $adminSeasonPage = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/admin" -WebSession $session
    if ($adminSeasonPage.StatusCode -ne 200) { throw "La page de gestion des saisons ne s'affiche pas correctement." }

    $match1Id = (& node scripts/test-support.mjs match-id $tempDb $($created.season.id) 1 1).Trim()
    $match1Body = @{ teamA = "Team Roquette"; teamB = "FC Alpha"; matchDate = "2026-10-10"; status = "terminé"; scoreA = 3; scoreB = 1 } | ConvertTo-Json -Compress
    $match1 = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/matches/$match1Id" -Method Patch -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $match1Body -WebSession $session
    if ($match1.match.status -ne "terminé" -or $match1.match.scoreA -ne 3) { throw "Le match terminé ou son score ne sont pas enregistrés." }
    $editMatchBody = @{ teamA = "Team Roquette"; teamB = "FC Alpha"; matchDate = "2026-10-10"; status = "terminé"; scoreA = 4; scoreB = 2 } | ConvertTo-Json -Compress
    $editedMatch = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/matches/$match1Id" -Method Patch -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $editMatchBody -WebSession $session
    if ($editedMatch.match.scoreA -ne 4 -or $editedMatch.match.scoreB -ne 2) { throw "La modification d'un score existant n'a pas été prise en compte." }

    $forfeitId = (& node scripts/test-support.mjs match-id $tempDb $($created.season.id) 2 1).Trim()
    $forfeitBody = @{ teamA = "Team Roquette"; teamB = "FC Beta"; matchDate = "2026-10-11"; status = "forfait"; forfeitingSide = "B" } | ConvertTo-Json -Compress
    $forfeited = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/matches/$forfeitId" -Method Patch -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $forfeitBody -WebSession $session
    if ($forfeited.match.scoreA -ne 3 -or $forfeited.match.scoreB -ne 0 -or $forfeited.match.forfeitingSide -ne "B") { throw "Le forfait ponctuel n'a pas produit le score 3-0 attendu." }

    $cancelledId = (& node scripts/test-support.mjs match-id $tempDb $($created.season.id) 1 3).Trim()
    $cancelledBody = @{ teamA = "FC Gamma"; teamB = "FC Delta"; matchDate = "2020-01-01"; status = "annulé" } | ConvertTo-Json -Compress
    Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/matches/$cancelledId" -Method Patch -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $cancelledBody -WebSession $session | Out-Null
    $pastMissingId = (& node scripts/test-support.mjs match-id $tempDb $($created.season.id) 1 4).Trim()
    $pastMissingBody = @{ teamA = "Team Roquette"; teamB = "FC Epsilon"; matchDate = "2020-01-02"; status = "à venir" } | ConvertTo-Json -Compress
    Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/matches/$pastMissingId" -Method Patch -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $pastMissingBody -WebSession $session | Out-Null
    $pastNoScoreId = (& node scripts/test-support.mjs match-id $tempDb $($created.season.id) 1 5).Trim()
    $pastNoScoreBody = @{ teamA = "Team Roquette"; teamB = "FC Theta"; matchDate = "2020-01-03"; status = "à venir" } | ConvertTo-Json -Compress
    Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/matches/$pastNoScoreId" -Method Patch -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $pastNoScoreBody -WebSession $session | Out-Null
    $otherPlayedId = (& node scripts/test-support.mjs match-id $tempDb $($created.season.id) 3 1).Trim()
    $otherPlayedBody = @{ teamA = "FC Beta"; teamB = "FC Gamma"; matchDate = "2026-10-15"; status = "termine"; scoreA = 1; scoreB = 2 } | ConvertTo-Json -Compress
    $otherPlayedBody = $otherPlayedBody.Replace('"termine"', '"terminé"')
    Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/matches/$otherPlayedId" -Method Patch -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $otherPlayedBody -WebSession $session | Out-Null

    $playerBody = @{ seasonId = $created.season.id; firstName = "Jean"; lastName = "Dupont"; jerseyNumber = "10" } | ConvertTo-Json -Compress
    $player = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/players" -Method Post -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $playerBody -WebSession $session
    if ($player.player.status -ne "actif" -or -not $player.player.isActive) { throw "Le nouveau joueur doit être actif et inscrit à la saison." }

    $anaBody = @{ seasonId = $created.season.id; firstName = "Ana"; lastName = "Martin"; jerseyNumber = "11" } | ConvertTo-Json -Compress
    $ana = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/players" -Method Post -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $anaBody -WebSession $session

    $cupBody = @{ opponentName = "FC Coupe"; phase = "Demi-finale"; matchDate = "2026-10-12" } | ConvertTo-Json -Compress
    $cup = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/seasons/$($created.season.id)/cup-matches" -Method Post -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $cupBody -WebSession $session
    $cupId = $cup.match.id
    $cupUpdateBody = @{ opponentName = "FC Coupe"; phase = "Demi-finale"; matchDate = "2026-10-12"; status = "termine"; scoreA = 2; scoreB = 1 } | ConvertTo-Json -Compress
    $cupUpdateBody = $cupUpdateBody.Replace('"termine"', '"terminé"')
    $cupUpdated = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/cup-matches/$cupId" -Method Patch -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $cupUpdateBody -WebSession $session
    if ($cupUpdated.match.scoreA -ne 2 -or $cupUpdated.match.scoreB -ne 1) { throw "Le score du match de coupe n'est pas enregistre." }

    $invalidStatsBody = @{ players = @(@{ playerId = $player.player.id; presence = $false; goals = 0; assists = 1; refereePayment = $false; mom = $false }) } | ConvertTo-Json -Depth 4 -Compress
    $invalidStatsStatus = 0
    try { Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/api/admin/matches/$cupId/stats" -Method Patch -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $invalidStatsBody -WebSession $session | Out-Null }
    catch { $invalidStatsStatus = [int]$_.Exception.Response.StatusCode }
    if ($invalidStatsStatus -ne 400) { throw "Une passe sans presence doit etre rejetee (HTTP $invalidStatsStatus)." }

    $cupStatsBody = @{ players = @(
        @{ playerId = $player.player.id; presence = $true; goals = 1; assists = 1; refereePayment = $true; mom = $true },
        @{ playerId = $ana.player.id; presence = $false; goals = 0; assists = 0; refereePayment = $true; mom = $true },
        @{ playerId = "player-csc"; presence = $false; goals = 1; assists = 0; refereePayment = $false; mom = $false }
    ) } | ConvertTo-Json -Depth 5 -Compress
    Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/matches/$cupId/stats" -Method Patch -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $cupStatsBody -WebSession $session | Out-Null
    $cupRoster = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/matches/$cupId/stats" -WebSession $session
    $jeanCupStats = $cupRoster.players | Where-Object { $_.playerId -eq $player.player.id } | Select-Object -First 1
    $anaCupStats = $cupRoster.players | Where-Object { $_.playerId -eq $ana.player.id } | Select-Object -First 1
    if (-not $jeanCupStats -or -not $jeanCupStats.refereePayment -or $jeanCupStats.isPriority) { throw "Le paiement d'arbitre ou le calcul de priorite du joueur n'est pas enregistre." }
    if (-not $anaCupStats -or $anaCupStats.presence -or -not $anaCupStats.refereePayment -or $anaCupStats.isPriority) { throw "Le paiement d'arbitre d'un joueur absent est accepté, et un joueur ayant payé n'est plus prioritaire." }
    $regularRoster = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/matches/$match1Id/stats" -WebSession $session
    $jeanRegular = $regularRoster.players | Where-Object { $_.playerId -eq $player.player.id } | Select-Object -First 1
    $anaRegular = $regularRoster.players | Where-Object { $_.playerId -eq $ana.player.id } | Select-Object -First 1
    if ($jeanRegular.isPriority -or $anaRegular.isPriority) { throw "La priorite arbitre doit tenir compte de tous les paiements de coupe pour chaque joueur." }
    $regularStatsBody = @{ players = @(
        @{ playerId = $player.player.id; presence = $true; goals = 2; assists = 1; refereePayment = $false; mom = $true },
        @{ playerId = $ana.player.id; presence = $true; goals = 1; assists = 0; refereePayment = $true; mom = $true }
    ) } | ConvertTo-Json -Depth 5 -Compress
    Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/matches/$match1Id/stats" -Method Patch -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $regularStatsBody -WebSession $session | Out-Null
    $cupStatsPage = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/admin/matchs/$cupId/joueurs" -WebSession $session
    if ($cupStatsPage.StatusCode -ne 200 -or $cupStatsPage.Content -notmatch "Jean Dupont" -or $cupStatsPage.Content -notmatch "Ana Martin") { throw "La page privee des statistiques de match ne s'affiche pas correctement." }

    $cupForfeitBody = @{ opponentName = "FC Coupe Forfait"; phase = "Premier tour"; matchDate = "2026-10-13" } | ConvertTo-Json -Compress
    $cupForfeit = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/seasons/$($created.season.id)/cup-matches" -Method Post -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $cupForfeitBody -WebSession $session
    $cupForfeitId = $cupForfeit.match.id
    $cupForfeitUpdate = @{ opponentName = "FC Coupe Forfait"; phase = "Premier tour"; matchDate = "2026-10-13"; status = "forfait"; forfeitingSide = "B" } | ConvertTo-Json -Compress
    $cupForfeited = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/cup-matches/$cupForfeitId" -Method Patch -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $cupForfeitUpdate -WebSession $session
    if ($cupForfeited.match.scoreA -ne 3 -or $cupForfeited.match.scoreB -ne 0) { throw "Le forfait de coupe n'attribue pas automatiquement 3-0 a Team Roquette." }
    $forfeitStats = @{ players = @(@{ playerId = $player.player.id; presence = $true; goals = 1; assists = 0; refereePayment = $false; mom = $false }) } | ConvertTo-Json -Depth 4 -Compress
    Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/matches/$cupForfeitId/stats" -Method Patch -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $forfeitStats -WebSession $session | Out-Null

    $cupCancelledBody = @{ opponentName = "FC Coupe Annule"; phase = "Tour de test"; matchDate = "2026-10-14" } | ConvertTo-Json -Compress
    $cupCancelled = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/seasons/$($created.season.id)/cup-matches" -Method Post -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $cupCancelledBody -WebSession $session
    $cupCancelledId = $cupCancelled.match.id
    $cancelCupBody = @{ opponentName = "FC Coupe Annule"; phase = "Tour de test"; matchDate = "2026-10-14"; status = "annule" } | ConvertTo-Json -Compress
    $cancelCupBody = $cancelCupBody.Replace('"annule"', '"annulé"')
    Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/cup-matches/$cupCancelledId" -Method Patch -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $cancelCupBody -WebSession $session | Out-Null
    $cancelStatsStatus = 0
    try { Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/api/admin/matches/$cupCancelledId/stats" -Method Patch -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $cupStatsBody -WebSession $session | Out-Null }
    catch { $cancelStatsStatus = [int]$_.Exception.Response.StatusCode }
    if ($cancelStatsStatus -ne 400) { throw "La saisie de statistiques doit etre refusee pour un match annule (HTTP $cancelStatsStatus)." }

    $cupBetaBody = @{ opponentName = "FC Beta"; phase = "Coupe locale"; matchDate = "2026-10-16" } | ConvertTo-Json -Compress
    $cupBeta = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/seasons/$($created.season.id)/cup-matches" -Method Post -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $cupBetaBody -WebSession $session
    $cupBetaId = $cupBeta.match.id
    $seasonTeams = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/seasons/$($created.season.id)/general-forfeits" -WebSession $session
    $alphaTeam = $seasonTeams.teams | Where-Object { $_.name -eq "FC Alpha" } | Select-Object -First 1
    $betaTeam = $seasonTeams.teams | Where-Object { $_.name -eq "FC Beta" } | Select-Object -First 1
    $epsilonTeam = $seasonTeams.teams | Where-Object { $_.name -eq "FC Epsilon" } | Select-Object -First 1
    if (-not $alphaTeam -or -not $betaTeam -or -not $epsilonTeam) { throw "Les equipes de la saison ne sont pas disponibles pour les forfaits generaux." }
    $alphaForfeitBody = @{ teamId = $alphaTeam.id } | ConvertTo-Json -Compress
    $alphaForfeit = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/seasons/$($created.season.id)/general-forfeits" -Method Post -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $alphaForfeitBody -WebSession $session
    if ($alphaForfeit.updatedMatches -ne 1) { throw "Le forfait general passe ne met pas a jour le match concerne." }
    $alphaRepeat = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/seasons/$($created.season.id)/general-forfeits" -Method Post -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $alphaForfeitBody -WebSession $session
    if (-not $alphaRepeat.alreadyDeclared -or $alphaRepeat.updatedMatches -ne 0) { throw "La declaration du forfait general doit etre idempotente." }
    foreach ($team in @($epsilonTeam, $betaTeam)) {
        $body = @{ teamId = $team.id } | ConvertTo-Json -Compress
        $generalDeclaration = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/seasons/$($created.season.id)/general-forfeits" -Method Post -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $body -WebSession $session
        if ($team.name -eq "FC Beta" -and $generalDeclaration.updatedMatches -ne 3) { throw "Le forfait general d'une equipe ne met pas a jour ses matchs de coupe." }
    }
    $betaCupStats = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/matches/$cupBetaId/stats" -WebSession $session
    $betaCupCsc = $betaCupStats.players | Where-Object { $_.playerId -eq "player-csc" } | Select-Object -First 1
    $betaCupPlayerGoals = @($betaCupStats.players | Where-Object { -not $_.isFake -and $_.goals -ne 0 })
    if (-not $betaCupCsc -or $betaCupCsc.goals -ne 3 -or $betaCupPlayerGoals.Count -ne 0) { throw "Le forfait general en coupe ne maintient pas CSC a trois buts." }
    $alphaStatsAfterForfeit = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/matches/$match1Id/stats" -WebSession $session
    $jeanPreserved = $alphaStatsAfterForfeit.players | Where-Object { $_.playerId -eq $player.player.id } | Select-Object -First 1
    $anaPreserved = $alphaStatsAfterForfeit.players | Where-Object { $_.playerId -eq $ana.player.id } | Select-Object -First 1
    if ($jeanPreserved.goals -ne 2 -or $anaPreserved.goals -ne 1) { throw "Les buts historiques des joueurs Team Roquette ont ete perdus." }
    $futureStats = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/matches/$pastMissingId/stats" -WebSession $session
    $futureCsc = $futureStats.players | Where-Object { $_.playerId -eq "player-csc" } | Select-Object -First 1
    $futurePlayerGoals = @($futureStats.players | Where-Object { -not $_.isFake -and $_.goals -ne 0 })
    if (-not $futureCsc -or $futureCsc.goals -ne 3 -or $futurePlayerGoals.Count -ne 0) { throw "Le forfait general futur ne credite pas exactement trois buts a CSC." }
    $invalidGeneralGoalsBody = @{ players = @(
        @{ playerId = $player.player.id; presence = $true; goals = 1; assists = 0; refereePayment = $false; mom = $false },
        @{ playerId = "player-csc"; presence = $false; goals = 2; assists = 0; refereePayment = $false; mom = $false }
    ) } | ConvertTo-Json -Depth 5 -Compress
    $invalidGeneralGoalsStatus = 0
    try { Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/api/admin/matches/$pastMissingId/stats" -Method Patch -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $invalidGeneralGoalsBody -WebSession $session | Out-Null }
    catch { $invalidGeneralGoalsStatus = [int]$_.Exception.Response.StatusCode }
    if ($invalidGeneralGoalsStatus -ne 400) { throw "Les buts fixes d'un forfait general ne doivent pas pouvoir etre modifies (HTTP $invalidGeneralGoalsStatus)." }
    $adminForfeitsPage = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/admin/forfaits?saison=$($created.season.id)" -WebSession $session
    if ($adminForfeitsPage.StatusCode -ne 200 -or $adminForfeitsPage.Content -notmatch "FC Alpha") { throw "La page d'administration des forfaits generaux ne s'affiche pas correctement (HTTP $($adminForfeitsPage.StatusCode)). Logs Next : $((Get-Content $stderr -Tail 15 -ErrorAction SilentlyContinue) -join "`n")" }

    $duplicateJerseyStatus = 0
    try {
        $body = @{ seasonId = $created.season.id; firstName = "Autre"; lastName = "Joueur"; jerseyNumber = "10" } | ConvertTo-Json -Compress
        Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/api/admin/players" -Method Post -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $body -WebSession $session | Out-Null
    } catch { $duplicateJerseyStatus = [int]$_.Exception.Response.StatusCode }
    if ($duplicateJerseyStatus -ne 409) { throw "Un numéro de maillot déjà utilisé dans la saison doit être rejeté (HTTP $duplicateJerseyStatus)." }

    $retireBody = @{ seasonId = $created.season.id; firstName = "Ana"; lastName = "Martin"; jerseyNumber = "11"; status = "retraité" } | ConvertTo-Json -Compress
    $retired = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/players/$($ana.player.id)" -Method Patch -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $retireBody -WebSession $session
    if ($retired.player.status -ne "retraité" -or $retired.player.isActive) { throw "Le retrait doit désactiver le joueur pour les effectifs." }

    $nextSeasonBody = @{ label = "2026-2027"; division = "Division test" } | ConvertTo-Json -Compress
    $nextSeason = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/seasons" -Method Post -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $nextSeasonBody -WebSession $session
    if ($nextSeason.copiedPlayers -ne 1) { throw "La nouvelle saison doit recopier uniquement le joueur actif (copiés : $($nextSeason.copiedPlayers))." }

    $retiredAddStatus = 0
    try {
        $body = @{ playerId = $ana.player.id; jerseyNumber = "12" } | ConvertTo-Json -Compress
        Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/api/admin/seasons/$($nextSeason.season.id)/players" -Method Post -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $body -WebSession $session | Out-Null
    } catch { $retiredAddStatus = [int]$_.Exception.Response.StatusCode }
    if ($retiredAddStatus -ne 400) { throw "Un joueur retraité ne doit pas être réintégré sans réactivation (HTTP $retiredAddStatus)." }

    $reactivateBody = @{ seasonId = $created.season.id; firstName = "Ana"; lastName = "Martin"; jerseyNumber = "11"; status = "actif" } | ConvertTo-Json -Compress
    $reactivated = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/players/$($ana.player.id)" -Method Patch -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $reactivateBody -WebSession $session
    if ($reactivated.player.status -ne "actif" -or $reactivated.player.isActive) { throw "La réactivation ne doit pas réinscrire automatiquement le joueur à une saison." }
    $addBody = @{ playerId = $ana.player.id; jerseyNumber = "12" } | ConvertTo-Json -Compress
    Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/seasons/$($nextSeason.season.id)/players" -Method Post -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $addBody -WebSession $session | Out-Null

    $adminPlayersPage = $null
    try { $adminPlayersPage = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/admin/joueurs?saison=$($nextSeason.season.id)" -WebSession $session }
    catch {
        $pageStatus = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { "unavailable" }
        $serverError = (Get-Content $stderr -Tail 30 -ErrorAction SilentlyContinue) -join "`n"
        throw "La page d'administration des joueurs a échoué (HTTP $pageStatus). Logs Next :`n$serverError"
    }
    if ($adminPlayersPage.StatusCode -ne 200 -or $adminPlayersPage.Content -notmatch "Gestion des joueurs") { throw "La page d'administration des joueurs ne s'affiche pas correctement." }
    $adminMatchesPage = $null
    try { $adminMatchesPage = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/admin/matchs?saison=$($created.season.id)&journee=1" -WebSession $session }
    catch {
        $pageStatus = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { "unavailable" }
        $serverError = (Get-Content $stderr -Tail 30 -ErrorAction SilentlyContinue) -join "`n"
        throw "La page d'administration des matchs a échoué (HTTP $pageStatus). Logs Next :`n$serverError"
    }
    if ($adminMatchesPage.StatusCode -ne 200 -or $adminMatchesPage.Content -notmatch "Gestion des matchs") { throw "La page d'administration des matchs ne s'affiche pas correctement (HTTP $($adminMatchesPage.StatusCode))." }
    $adminCupsPage = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/admin/coupes?saison=$($created.season.id)" -WebSession $session
    if ($adminCupsPage.StatusCode -ne 200 -or $adminCupsPage.Content -notmatch "Gestion de la coupe" -or $adminCupsPage.Content -notmatch "FC Coupe") { throw "La page d'administration de la coupe ne s'affiche pas correctement." }

    $retireAgainBody = @{ seasonId = $created.season.id; firstName = "Ana"; lastName = "Martin"; jerseyNumber = "11"; status = "retraité" } | ConvertTo-Json -Compress
    Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/players/$($ana.player.id)" -Method Patch -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $retireAgainBody -WebSession $session | Out-Null
    $playerHistoryPage = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/admin/joueurs/historique" -WebSession $session
    $historyHasJean = $playerHistoryPage.Content -match "Jean Dupont"
    $historyHasAna = $playerHistoryPage.Content -match "Ana Martin"
    $historyHasRetired = $playerHistoryPage.Content -match "Retrait"
    $historyHasAnaLink = $playerHistoryPage.Content -match ([regex]::Escape("/admin/joueurs/historique/$($ana.player.id)"))
    if ($playerHistoryPage.StatusCode -ne 200 -or -not $historyHasJean -or -not $historyHasAna -or -not $historyHasRetired -or -not $historyHasAnaLink) { throw "L'historique V2: HTTP=$($playerHistoryPage.StatusCode), Jean=$historyHasJean, Ana=$historyHasAna, Retraité=$historyHasRetired, lienFiche=$historyHasAnaLink." }
    $anaHistoryPage = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/admin/joueurs/historique/$($ana.player.id)" -WebSession $session
    $anaProfileHasName = $anaHistoryPage.Content -match "Ana" -and $anaHistoryPage.Content -match "Martin"
    $anaProfileHasSeason1 = $anaHistoryPage.Content -match "2025-2026"
    $anaProfileHasSeason2 = $anaHistoryPage.Content -match "2026-2027"
    if ($anaHistoryPage.StatusCode -ne 200 -or -not $anaProfileHasName -or -not $anaProfileHasSeason1 -or -not $anaProfileHasSeason2) { throw "La fiche V2: HTTP=$($anaHistoryPage.StatusCode), nom=$anaProfileHasName, saison1=$anaProfileHasSeason1, saison2=$anaProfileHasSeason2." }
    $anonymousHistoryPage = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/admin/joueurs/historique"
    $anonymousProfilePage = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/admin/joueurs/historique/$($ana.player.id)"
    if ($anonymousHistoryPage.Content -match "Jean Dupont|Ana Martin" -or $anonymousProfilePage.Content -match "Jean Dupont|Ana Martin") { throw "Les fiches complètes de joueurs ne doivent pas être visibles sans session admin." }
    $publicPlayerStandings = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/public/player-standings?saison=$($created.season.id)"
    $jeanRank = $publicPlayerStandings.standings | Where-Object { $_.player -eq "Jean D." } | Select-Object -First 1
    $anaRank = $publicPlayerStandings.standings | Where-Object { $_.player -eq "Ana M." } | Select-Object -First 1
    if ($publicPlayerStandings.totalMatches -ne 7 -or -not $jeanRank -or -not $anaRank) { throw "Le classement public des joueurs n'inclut pas les saisons et matchs attendus." }
    if ($publicPlayerStandings.standings[0].player -ne "Jean D." -or $jeanRank.appearances -ne 3 -or $jeanRank.goals -ne 4 -or $jeanRank.assists -ne 2 -or $jeanRank.mom -ne 2 -or $jeanRank.winPercentage -ne 100 -or $jeanRank.appearancePercentage -ne 43) { throw "Les statistiques ou le tri du classement de Jean sont incorrects." }
    if ([Math]::Abs($jeanRank.goalsPerAppearance - (4.0 / 3.0)) -gt 0.001 -or [Math]::Abs($jeanRank.assistsPerAppearance - (2.0 / 3.0)) -gt 0.001 -or [Math]::Abs($anaRank.goalsPerAppearance - 1.0) -gt 0.001) { throw "Les moyennes du classement joueurs sont incorrectes." }
    if ($anaRank.appearances -ne 1 -or $anaRank.goals -ne 1 -or $anaRank.mom -ne 2 -or $anaRank.winPercentage -ne 100 -or $anaRank.appearancePercentage -ne 14) { throw "Les statistiques de la joueuse retraitee ne sont pas conservees." }
    if (($publicPlayerStandings | ConvertTo-Json -Depth 6) -match "first_name|last_name|firstName|lastName|jerseyNumber|Dupont|Martin|player-csc") { throw "L'API publique du classement joueurs expose une identité complète ou CSC." }
    $playerStandingsPage = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/classement-joueurs?saison=$($created.season.id)"
    if ($playerStandingsPage.StatusCode -ne 200 -or $playerStandingsPage.Content -notmatch "Jean D\." -or $playerStandingsPage.Content -notmatch "Ana M\." -or $playerStandingsPage.Content -match "Jean Dupont|Ana Martin") { throw "La page publique du classement joueurs n'affiche pas le prénom complet et l'initiale du nom." }
    $playerCareerPage = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/statistiques-joueurs"
    if ($playerCareerPage.StatusCode -ne 200 -or $playerCareerPage.Content -notmatch "Statistiques des joueurs" -or $playerCareerPage.Content -notmatch "Buts /" -or $playerCareerPage.Content -notmatch "<svg" -or $playerCareerPage.Content -match "Jean Dupont|Ana Martin|player-csc") { throw "La vue publique multi-saisons des joueurs est absente, sans histogramme, ou expose une identité complète/CSC." }
    $teamHistoryPage = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/statistiques-equipe"
    $teamHistoryChartCount = [regex]::Matches($teamHistoryPage.Content, "<svg").Count
    if ($teamHistoryPage.StatusCode -ne 200 -or $teamHistoryPage.Content -notmatch "Historique" -or $teamHistoryPage.Content -notmatch "Bilan par saison" -or $teamHistoryPage.Content -notmatch "Total cumul" -or $teamHistoryPage.Content -notmatch "Meilleur buteur" -or $teamHistoryChartCount -ne 3 -or $teamHistoryPage.Content -match "Jean Dupont|Ana Martin|player-csc") { throw "L’historique public de Team Roquette doit afficher les bilans, leaders et trois graphiques sans identité complète/CSC." }

    $publicSeasons = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/public/seasons"
    $properties = @($publicSeasons.seasons[0].PSObject.Properties.Name | Sort-Object) -join ","
    if ($properties -ne "division,id,label") { throw "L'API publique des saisons renvoie des champs inattendus : $properties" }
    $publicResults = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/public/results?saison=$($created.season.id)"
    $publicMatch = $publicResults.matches | Where-Object { $_.id -eq $match1Id } | Select-Object -First 1
    $publicForfeit = $publicResults.matches | Where-Object { $_.id -eq $forfeitId } | Select-Object -First 1
    $publicCancelled = $publicResults.matches | Where-Object { $_.id -eq $cancelledId } | Select-Object -First 1
    $publicPastMissing = $publicResults.matches | Where-Object { $_.id -eq $pastMissingId } | Select-Object -First 1
    $publicOtherPlayed = $publicResults.matches | Where-Object { $_.id -eq $otherPlayedId } | Select-Object -First 1
    $publicNoScore = $publicResults.matches | Where-Object { $_.id -eq $pastNoScoreId } | Select-Object -First 1
    $publicCup = $publicResults.matches | Where-Object { $_.id -eq $cupId } | Select-Object -First 1
    $publicCupForfeit = $publicResults.matches | Where-Object { $_.id -eq $cupForfeitId } | Select-Object -First 1
    $publicCupCancelled = $publicResults.matches | Where-Object { $_.id -eq $cupCancelledId } | Select-Object -First 1
    $publicCupBeta = $publicResults.matches | Where-Object { $_.id -eq $cupBetaId } | Select-Object -First 1
    if (-not $publicMatch -or $publicMatch.scoreA -ne 3 -or $publicMatch.scoreB -ne 0 -or $publicMatch.status -ne "forfait" -or -not $publicMatch.teamAIsRoquette) { throw "Le match passe contre une equipe forfaitaire n'affiche pas 3-0 pour Team Roquette." }
    if (-not $publicForfeit -or $publicForfeit.scoreA -ne 3 -or $publicForfeit.scoreB -ne 0) { throw "Le score du forfait ponctuel n'est pas expose dans les resultats publics." }
    if (-not $publicCancelled -or $publicCancelled.status -ne "annulé") { throw "Le statut de match annulé n'est pas exposé publiquement." }
    if (-not $publicPastMissing -or $publicPastMissing.scoreA -ne 3 -or $publicPastMissing.scoreB -ne 0 -or $publicPastMissing.status -ne "forfait") { throw "Le match futur contre l'equipe forfaitaire n'est pas fixe a 3-0." }
    if (-not $publicOtherPlayed -or $publicOtherPlayed.scoreA -ne 0 -or $publicOtherPlayed.scoreB -ne 3 -or $publicOtherPlayed.status -ne "forfait") { throw "Le match passe entre autres equipes n'est pas recalcule a 3-0." }
    if (-not $publicCup -or $publicCup.type -ne "cup" -or $publicCup.phase -ne "Demi-finale" -or $publicCup.teamA -ne "Team Roquette" -or $publicCup.teamB -ne "FC Coupe") { throw "Le match ou la phase de coupe ne sont pas exposés publiquement." }
    if (-not $publicCupForfeit -or $publicCupForfeit.scoreA -ne 3 -or $publicCupForfeit.scoreB -ne 0) { throw "Le résultat du forfait de coupe n'est pas exposé correctement." }
    if (-not $publicCupCancelled -or $publicCupCancelled.status -ne "annulé") { throw "Le statut du match de coupe annulé n'est pas exposé publiquement." }
    if (-not $publicCupBeta -or $publicCupBeta.scoreA -ne 3 -or $publicCupBeta.scoreB -ne 0 -or $publicCupBeta.status -ne "forfait") { throw "Le forfait general n'a pas recalcule le match de coupe correspondant." }
    if (-not $publicNoScore -or $publicNoScore.status -ne "à venir" -or $publicNoScore.scoreA -ne $null -or $publicNoScore.scoreB -ne $null) { throw "Le match passe sans score doit rester visible dans le calendrier." }
    if (($publicResults | ConvertTo-Json -Depth 5) -match "first_name|last_name|firstName|lastName|forfeitingTeamId|Jean|Dupont|Ana|Martin") {
        throw "Une API publique semble exposer des données personnelles ou un identifiant interne de forfait."
    }
    $publicResultsPage = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/resultats?saison=$($created.season.id)"
    if ($publicResultsPage.StatusCode -ne 200 -or $publicResultsPage.Content -notmatch "date-past-no-score" -or $publicResultsPage.Content -notmatch "match-roquette" -or $publicResultsPage.Content -match "FC Gamma|FC Delta") { throw "La page publique des résultats n'affiche pas uniquement les matchs de Team Roquette ou ne rend pas leurs statuts et couleurs de date." }

    $publicStandings = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/public/standings?saison=$($created.season.id)"
    $trStanding = $publicStandings.standings | Where-Object { $_.teamName -eq "Team Roquette" } | Select-Object -First 1
    $alphaStanding = $publicStandings.standings | Where-Object { $_.teamName -eq "FC Alpha" } | Select-Object -First 1
    $betaStanding = $publicStandings.standings | Where-Object { $_.teamName -eq "FC Beta" } | Select-Object -First 1
    $cancelledTeamStanding = $publicStandings.standings | Where-Object { $_.teamName -eq "FC Delta" } | Select-Object -First 1
    $gammaStanding = $publicStandings.standings | Where-Object { $_.teamName -eq "FC Gamma" } | Select-Object -First 1
    if (-not $trStanding -or $trStanding.points -ne 12 -or $trStanding.wins -ne 3 -or $trStanding.roundsPlayed -ne 2 -or $trStanding.goalsFor -ne 10 -or $trStanding.goalsAgainst -ne 2) { throw "Le classement Team Roquette ne conserve pas les buts historiques et les victoires après forfait general : $($trStanding | ConvertTo-Json -Compress)" }
    if (-not $alphaStanding -or $alphaStanding.points -ne 0 -or $alphaStanding.losses -ne 26 -or $alphaStanding.forfeits -ne 26 -or $alphaStanding.goalsFor -ne 0 -or $alphaStanding.goalsAgainst -ne 78 -or $alphaStanding.goalDifference -ne -78) { throw "Le classement d'une equipe en forfait general n'applique pas la ligne fixe." }
    if (-not $betaStanding -or $betaStanding.points -ne 0 -or $betaStanding.losses -ne 26 -or $betaStanding.forfeits -ne 26 -or $betaStanding.goalsFor -ne 0 -or $betaStanding.goalsAgainst -ne 78 -or $betaStanding.goalDifference -ne -78) { throw "Le forfait general de FC Beta n'est pas applique dans le classement." }
    if (-not $gammaStanding -or $gammaStanding.points -ne 4 -or $gammaStanding.wins -ne 1 -or $gammaStanding.goalsFor -ne 3) { throw "Le match passe entre autres equipes n'accorde pas la victoire a l'equipe non forfaitaire." }
    if ($cancelledTeamStanding) { throw "Un match annulé doit être totalement exclu du classement." }
    if (($publicStandings | ConvertTo-Json -Depth 5) -match "first_name|last_name|firstName|lastName|teamId|forfaitGeneral") { throw "L'API publique du classement renvoie des champs internes ou des données personnelles." }
    $standingsPage = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/classement-equipes?saison=$($created.season.id)"
    if ($standingsPage.StatusCode -ne 200 -or $standingsPage.Content -notmatch "Classement des") { throw "La page publique du classement ne s'affiche pas correctement." }
    $nextSeasonStandings = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/public/standings?saison=$($nextSeason.season.id)"
    if ($nextSeasonStandings.standings | Where-Object { $_.teamName -in @("FC Alpha", "FC Beta", "FC Epsilon") }) { throw "Un forfait general a deborde sur une autre saison." }

    $audit = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/audit" -WebSession $session
    if ($audit.events.Count -lt 7) { throw "Les actions d'administration n'ont pas toutes été historisées." }
    $counts = (& node scripts/test-support.mjs counts $tempDb) | ConvertFrom-Json
    if ($counts.rounds -ne 52 -or $counts.matches -ne 368 -or $counts.cupMatches -ne 4 -or $counts.playerMatchStats -lt 8 -or $counts.csc -ne 1) { throw "Comptages SQLite inattendus." }
    if ($counts.completedMatches -ne 1 -or $counts.forfeitedMatches -ne 6 -or $counts.cancelledMatches -ne 2 -or $counts.teams -ne 11) { throw "Comptages de matchs/équipes inattendus." }
    if ($counts.realPlayers -ne 2 -or $counts.seasonPlayers -ne 4 -or $counts.activeSeasonPlayers -ne 2 -or -not $counts.hasSeasonPlayerActiveColumn -or -not $counts.hasForfeitingTeamColumn -or -not $counts.hasOriginalScores -or -not $counts.hasSeasonTeamForfeits) { throw "Comptages ou migration de schéma inattendus : $($counts | ConvertTo-Json -Compress)." }

    $historicalSeasonBody = @{ label = "2017-2018"; division = "5A"; historicalOnly = $true } | ConvertTo-Json -Compress
    $historicalSeason = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/seasons" -Method Post -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $historicalSeasonBody -WebSession $session
    if (-not $historicalSeason.historicalOnly -or $historicalSeason.season.matchCount -ne 0 -or $historicalSeason.copiedPlayers -ne 0) { throw "La saison agrégée doit être créée sans matchs, ni joueurs copiés." }
    $historicalRosterBody = @{ playerId = $player.player.id; jerseyNumber = $null } | ConvertTo-Json -Compress
    Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/seasons/$($historicalSeason.season.id)/players" -Method Post -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $historicalRosterBody -WebSession $session | Out-Null
    $historicalTotalsBody = @{
        team = @{ matchesPlayed = 23; wins = 7; draws = 2; losses = 14; forfeits = 0; goalsFor = 45; goalsAgainst = 71; points = 46 }
        players = @(@{ playerId = $player.player.id; appearances = 1; goals = 1; assists = 0; mom = 1 })
    } | ConvertTo-Json -Depth 6 -Compress
    $historicalTotals = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/seasons/$($historicalSeason.season.id)/historical-totals" -Method Post -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $historicalTotalsBody -WebSession $session
    if ($historicalTotals.playerCount -ne 1 -or $historicalTotals.team.points -ne 46) { throw "Les statistiques agrégées n'ont pas été enregistrées." }
    $historicalCounts = (& node scripts/test-support.mjs season-counts $tempDb $($historicalSeason.season.id)) | ConvertFrom-Json
    if ($historicalCounts.rounds -ne 0 -or $historicalCounts.matches -ne 0 -or $historicalCounts.seasonPlayers -ne 1 -or $historicalCounts.playerTotals -ne 1 -or $historicalCounts.teamTotals -ne 1) { throw "La saison historique contient des matchs fictifs ou des agrégats incomplets : $($historicalCounts | ConvertTo-Json -Compress)." }
    $historicalPlayerStandings = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/public/player-standings?saison=$($historicalSeason.season.id)"
    $historicalPlayer = $historicalPlayerStandings.standings | Where-Object { $_.player -eq "Jean D." } | Select-Object -First 1
    if (-not $historicalPlayerStandings.aggregateOnly -or $historicalPlayerStandings.totalMatches -ne 23 -or -not $historicalPlayer -or $historicalPlayer.appearances -ne 1 -or $historicalPlayer.goals -ne 1 -or $historicalPlayer.mom -ne 1 -or $null -ne $historicalPlayer.winPercentage) { throw "Le classement joueur historique n'expose pas les totaux agrégés sans inventer le taux de victoire." }
    $historicalTeamStandings = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/public/standings?saison=$($historicalSeason.season.id)"
    $historicalTeam = $historicalTeamStandings.standings | Where-Object { $_.teamName -eq "Team Roquette" } | Select-Object -First 1
    if (-not $historicalTeamStandings.aggregateOnly -or -not $historicalTeam -or $historicalTeam.roundsPlayed -ne 23 -or $historicalTeam.wins -ne 7 -or $historicalTeam.draws -ne 2 -or $historicalTeam.losses -ne 14 -or $historicalTeam.points -ne 46 -or $historicalTeam.goalsFor -ne 45 -or $historicalTeam.goalsAgainst -ne 71) { throw "Le bilan d'équipe historique agrégé est incomplet." }
    $historicalResults = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/public/results?saison=$($historicalSeason.season.id)"
    if ($historicalResults.matches.Count -ne 0) { throw "Des adversaires ou matchs fictifs sont visibles dans la saison historique." }
    $historicalPlayersPage = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/admin/joueurs?saison=$($historicalSeason.season.id)" -WebSession $session
    if ($historicalPlayersPage.StatusCode -ne 200 -or $historicalPlayersPage.Content -notmatch "Jean") { throw "La page d'effectif historique ne s'affiche pas." }
    $historicalMatchesPage = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/admin/matchs?saison=$($historicalSeason.season.id)" -WebSession $session
    if ($historicalMatchesPage.StatusCode -ne 200) { throw "La page des matchs doit rester accessible pour une saison sans calendrier." }
    $historicalDirectory = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/admin/joueurs/historique" -WebSession $session
    $historicalProfile = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/admin/joueurs/historique/$($player.player.id)" -WebSession $session
    if ($historicalDirectory.StatusCode -ne 200 -or $historicalProfile.StatusCode -ne 200 -or $historicalProfile.Content -notmatch "2017-2018" -or $historicalProfile.Content -notmatch "23" -or $historicalProfile.Content -notmatch "agr") { throw "L'historique privé des joueurs ne reprend pas les statistiques agrégées." }
    $historicalCareerPage = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/statistiques-joueurs"
    $careerHasAggregateNote = $historicalCareerPage.Content -match "Certaines saisons" -and $historicalCareerPage.Content -match "taux de victoire individuels"
    $careerHasPlayer = $historicalCareerPage.Content -match "Jean D\."
    if ($historicalCareerPage.StatusCode -ne 200 -or -not $careerHasAggregateNote -or -not $careerHasPlayer) { throw "Les totaux agrégés ne sont pas repris dans les statistiques joueurs toutes saisons (HTTP=$($historicalCareerPage.StatusCode), note=$careerHasAggregateNote, joueur=$careerHasPlayer)." }
    $historicalTeamPage = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/statistiques-equipe"
    if ($historicalTeamPage.StatusCode -ne 200 -or $historicalTeamPage.Content -notmatch "2017-2018" -or $historicalTeamPage.Content -notmatch "bilan agr") { throw "Les totaux agrégés ne sont pas repris dans l'historique public de l'équipe." }
    $historyAudit = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/admin/audit" -WebSession $session
    if (-not ($historyAudit.events | Where-Object { $_.action -eq "season.historical-totals.set" -and $_.entityId -eq $historicalSeason.season.id })) { throw "L'import des totaux historiques n'a pas été audité." }

    for ($i = 1; $i -le 6; $i++) {
        $badBody = @{ username = $env:ADMIN_USERNAME; password = "incorrect-$i" } | ConvertTo-Json -Compress
        $badStatus = 0
        try {
            Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/api/admin/login" -Method Post -Headers @{ Origin = "http://127.0.0.1:$port" } -ContentType "application/json" -Body $badBody | Out-Null
        } catch { $badStatus = [int]$_.Exception.Response.StatusCode }
        if ($i -le 5 -and $badStatus -ne 401) { throw "Tentative invalide ${i}: HTTP $badStatus au lieu de 401." }
        if ($i -eq 6 -and $badStatus -ne 429) { throw "Le limiteur doit bloquer la 6e tentative (HTTP $badStatus)." }
    }

    Write-Output "PASS accueil public (HTTP 200)"
    Write-Output "PASS connexion administrateur, session et protection des APIs admin"
    Write-Output "PASS requête cross-origin rejetée et limiteur de connexion"
    Write-Output "PASS création saison : 26 journées, 182 matchs vides"
    Write-Output "PASS modification de saison après démarrage"
    Write-Output "PASS matchs de coupe dedies, phases libres, resultats publics et forfaits 0-3"
    Write-Output "PASS statistiques joueur-match : presence, buts, assists, MOM, CSC et arbitre"
    Write-Output "PASS priorite arbitre commune a la saison reguliere et a la coupe"
    Write-Output "PASS forfait general par saison : scores historiques, autres equipes, CSC, classement fixe et coupe"
    Write-Output "PASS classement saisonnier joueur : calculs, tri, exclusion CSC et identité publique prénom + initiale du nom"
    Write-Output "PASS statistiques joueurs toutes saisons : histogramme, tableau et identites publiques sans nom complet ni CSC"
    Write-Output "PASS statistiques Team Roquette : totaux, divisions, leaders et trois histogrammes"
    Write-Output "PASS pages privees saisons, effectifs, matchs, coupe, statistiques joueur-match et forfaits generaux"
    Write-Output "PASS V2 historique des joueurs actifs et retraités, fiches par saison et protection admin"
    Write-Output "PASS API et page publiques des résultats réguliers et de coupe, identifiants joueurs absents et dates colorées"
    Write-Output "PASS classement public, barème de points, forfait et exclusion des matchs annulés"

    Write-Output "PASS création, unicité, retrait, réactivation et gestion des effectifs joueurs"
    Write-Output "PASS copie saisonnière des seuls joueurs actifs et migration de schéma"
    Write-Output "PASS API publique limitée aux données de saison/résultats"
    Write-Output "PASS actions d'administration historisées"
    Write-Output "PASS comptages SQLite rounds=$($counts.rounds) matches=$($counts.matches) joueurs=$($counts.realPlayers) liensEffectif=$($counts.seasonPlayers)"
    Write-Output "PASS saison historique agrégée : aucun match/journée fictif, classements d’équipe et joueurs, audit"

}
finally {
    if ($process -and (Get-Process -Id $process.Id -ErrorAction SilentlyContinue)) { Stop-Process -Id $process.Id -Force }
    Remove-Item $stdout, $stderr, $tempDb, "$tempDb-wal", "$tempDb-shm" -Force -ErrorAction SilentlyContinue
    Remove-Item Env:DATABASE_PATH, Env:ADMIN_USERNAME, Env:ADMIN_PASSWORD_HASH -ErrorAction SilentlyContinue
}
