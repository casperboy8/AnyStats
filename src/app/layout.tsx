import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { getSession } from "@/lib/auth";
import { getUserOrgs } from "@/lib/org";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AnyStats",
  description: "De Anytimer Tracker",
  icons: {
    icon: [
      { url: '/anystats-icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
  },
};

// Kleurt de mobiele browser-balk mee met de achtergrond (licht/donker)
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9f9f8' },
    { media: '(prefers-color-scheme: dark)', color: '#0e0e11' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const orgs = session ? getUserOrgs(session.id) : [];

  return (
    <html lang="nl" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Zet dark class vóór eerste render zodat er geen witte flits is */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var t=localStorage.getItem('theme');
            var prefer=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
            if((t||prefer)==='dark') document.documentElement.classList.add('dark');
          })()
        `}} />
      </head>
      <body className="min-h-full flex flex-col bg-[#f9f9f8] dark:bg-[#0e0e11]">
        <ThemeProvider>
          <Navbar user={session} orgs={orgs} />
          <main className="flex-1 pb-16 sm:pb-0">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
