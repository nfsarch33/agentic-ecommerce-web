import type { Metadata } from "next";
import { CartProvider } from "@/components/CartProvider";
import { resolveDeploymentConfig } from "@/lib/server/deployment-config";
import "./globals.css";

const publicAppOrigin = resolveDeploymentConfig().publicAppOrigin ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(publicAppOrigin),
  title: "Agentic Ecommerce",
  description: "AI-assisted ecommerce storefront with an operator admin console and workflow automation.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
