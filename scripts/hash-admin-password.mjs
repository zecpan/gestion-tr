import { randomBytes, scryptSync } from "node:crypto";
import { stdin, stdout } from "node:process";

if (!stdin.isTTY || !stdin.setRawMode) {
  console.error("Exécutez cette commande dans un terminal interactif.");
  process.exit(1);
}

stdout.write("Mot de passe administrateur (saisie masquée) : ");
stdin.setRawMode(true);
stdin.setEncoding("utf8");
stdin.resume();
let password = "";
let finished = false;
function finish() {
  if (finished) return;
  finished = true;
  stdin.setRawMode(false);
  stdin.pause();
  stdout.write("\n");
  if (password.length < 12) {
    password = "";
    console.error("Le mot de passe doit contenir au moins 12 caractères.");
    process.exit(1);
  }
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");
  password = "";
  console.log(`ADMIN_PASSWORD_HASH=scrypt$${salt}$${hash}`);
}
stdin.on("data", (chunk) => {
  for (const character of chunk) {
    if (character === "\u0003") { stdout.write("\nAnnulé.\n"); process.exit(130); }
    if (character === "\r" || character === "\n") { finish(); return; }
    if (character === "\u007f" || character === "\b") password = password.slice(0, -1);
    else if (character >= " ") password += character;
  }
});
