import "./globals.css";

export const metadata = {
  title: "Team Roquette",
  description: "Résultats, classements et gestion de Team Roquette.",
};

export default function RootLayout({ children }) {
  return <html lang="fr"><body>{children}</body></html>;
}
