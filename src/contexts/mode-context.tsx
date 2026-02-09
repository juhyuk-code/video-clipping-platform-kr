"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useSession } from "next-auth/react";

type Mode = "creator" | "clipper";

interface ModeContextType {
  mode: Mode;
}

const ModeContext = createContext<ModeContextType>({
  mode: "creator",
});

export function ModeProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();

  const role = session?.user?.role;
  const mode: Mode = role === "CLIPPER" ? "clipper" : "creator";

  return (
    <ModeContext.Provider value={{ mode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
