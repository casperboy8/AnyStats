import type { Metadata } from "next";
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
      <body className="min-h-full flex flex-col bg-[#f9f9f8] dark:bg-[#111113]">
        <ThemeProvider>
          <Navbar user={session} orgs={orgs} />
          <main className="flex-1">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
