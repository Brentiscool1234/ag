import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SEO Page Generator",
  description: "Generate SEO-optimized service-area pages for local businesses.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <a href="/" className="brand">
            SEO Page Generator
          </a>
          <span className="tagline">Service-area pages, schema, internal links, urls.txt</span>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
