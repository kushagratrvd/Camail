import "@/styles/globals.css";
import { type Metadata } from "next";
import { TRPCReactProvider } from "@/trpc/react";
import { Inter } from "next/font/google";
import AppLayout from "./app-layout";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Camail",
  description: "AI assistant for your Gmail and Calendar",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body 
        className={`${inter.className} font-sans text-gray-800 h-screen w-full overflow-hidden flex items-center justify-center p-4 sm:p-8 selection:bg-brand-pink selection:text-white`}
        style={{
          backgroundImage: "url('/bg.png'), linear-gradient(135deg, #efe7fc 0%, #fbebf3 100%)",
          backgroundColor: "#efe7fc",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          backgroundRepeat: "no-repeat"
        }}
      >
        <TRPCReactProvider>
          <Suspense fallback={null}>
            <AppLayout>{children}</AppLayout>
          </Suspense>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
