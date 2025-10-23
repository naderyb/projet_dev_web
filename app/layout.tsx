import "./globals.css";
import type { ReactNode } from "react";

type Metadata = {
  title?: string;
  description?: string;
  keywords?: string;
};

export const metadata: Metadata = {
  title: "Tbib El Jou3 - طبيب الجوع",
  description: "Livraison de repas en Algérie - أفضل خدمة توصيل طعام",
  keywords: "livraison, restaurant, algérie, طعام, توصيل",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="scroll-smooth">
      <body className="font-sans antialiased bg-gray-50">{children}</body>
    </html>
  );
}
