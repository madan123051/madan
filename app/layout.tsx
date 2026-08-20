import type { Metadata } from "next";
import "./globals.css";

const profileImage =
  "https://madan-wilds-aura.breezy-knoll-5462.chatgpt.site/images/madan-profile.webp";

export const metadata: Metadata = {
  metadataBase: new URL("https://madan.wildsaura.com"),
  title: "Madan Wilds Aura",
  description:
    "Personal photography portfolio and private gallery access by Madan Shrestha.",
  openGraph: {
    title: "Madan Wilds Aura",
    description:
      "Wildlife, events, portraits, travel stories, and private client galleries by Madan Shrestha.",
    images: [profileImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Madan Wilds Aura",
    description:
      "Personal photography portfolio and private gallery access by Madan Shrestha.",
    images: [profileImage],
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
