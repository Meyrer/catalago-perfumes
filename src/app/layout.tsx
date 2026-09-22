import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

const sansFont = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const serifFont = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ELEGANCE • Alta Perfumaria & Beleza",
  description: "Catálogo exclusivo de maquiagens, perfumes, skincare e cosméticos importados com atendimento personalizado pelo WhatsApp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${sansFont.variable} ${serifFont.variable}`}>
      <body className="antialiased bg-white text-[#1a1a1a] font-sans selection:bg-[#eedfd2] selection:text-[#1a1a1a]">
        {children}
      </body>
    </html>
  );
}
