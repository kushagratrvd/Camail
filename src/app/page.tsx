"use client";

import dynamic from "next/dynamic";

const SaaSLanding = dynamic(
  () => import("@/app/_components/saas-landing").then(m => ({ default: m.SaaSLanding })),
  { ssr: false }
);

export default function Home() {
  return <SaaSLanding />;
}
