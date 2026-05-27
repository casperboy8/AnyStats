import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { getSession } from "@/lib/auth";
import { getUserOrgs } from "@/lib/org";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AnyStats",
  description: "De Anytimer Tracker",
  icons: {
    icon: [{ url: '/anystats-icon.svg', type: 'image/svg+xml' }],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const orgs = session ? getUserOrgs(session.id) : [];

  return (
    <html lang="nl" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50">
        <Navbar user={session} orgs={orgs} />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
