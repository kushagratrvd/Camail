import "@/styles/globals.css";
import { type Metadata } from "next";
import { TRPCReactProvider } from "@/trpc/react";
import { Geist } from "next/font/google";
import AppLayout from "./app-layout";
import { Suspense } from "react";

const geistSans = Geist({
  subsets: ["latin"],
});

import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "Camail",
  description: "AI assistant for your Gmail and Calendar",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body 
        className={`${geistSans.className} font-sans text-zinc-900 dark:text-zinc-100 min-h-screen selection:bg-zinc-800 selection:text-white dark:selection:bg-zinc-200 dark:selection:text-black`}
      >
        <TRPCReactProvider>
          <TooltipProvider>
            <Suspense fallback={null}>
              <AppLayout>{children}</AppLayout>
            </Suspense>
          </TooltipProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
