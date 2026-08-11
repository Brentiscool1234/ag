import type { Metadata } from "next";
import "./globals.css";
import AccountBar from "./components/AccountBar";

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
          <span style={{ flex: 1 }} />
          <AccountBar />
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
