import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SportGuard — AI Sports Injury Risk Detection",
  description:
    "AI-powered platform that analyses athlete movement videos to detect injury risks, provide biomechanical insights, and deliver personalised recovery recommendations.",
  keywords: ["sports injury", "AI", "biomechanics", "pose estimation", "athlete health"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
