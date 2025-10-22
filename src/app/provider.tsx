"use client";
import { SessionProvider } from "next-auth/react";
import { use } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
