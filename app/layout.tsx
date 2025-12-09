import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import BackgroundAnimation from "./components/BackgroundAnimation";
import SessionProvider from "./components/SessionProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tbib El Jou3 - Algerian Food Delivery",
  description: "Order authentic Algerian cuisine delivered to your door",
  keywords: "Algerian food, delivery, couscous, tagine, halal food",
  authors: [{ name: "Tbib El Jou3 Team" }],
  openGraph: {
    title: "Tbib El Jou3 - Authentic Algerian Cuisine",
    description:
      "Experience the rich flavors of Algeria delivered fresh to your doorstep",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Cairo:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <SessionProvider>
          <div className="zelij-overlay">
            
            <BackgroundAnimation />                
                <main className="min-h-screen">{children}</main>

                {/* wrap Navbar with id so admin UI can hide it via DOM */}
                <div id="site-navbar">
                  <Navbar />
                </div>

                <Footer />
          </div>
          <Toaster position="top-right" />
        </SessionProvider>
      </body>
    </html>
  );
}
