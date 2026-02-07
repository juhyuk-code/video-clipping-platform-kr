"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Mode = "creator" | "clipper";

interface ModeContextType {
  mode: Mode;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
}

const ModeContext = createContext<ModeContextType>({
  mode: "creator",
  setMode: () => {},
  toggleMode: () => {},
});

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>("creator");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("platform-mode") as Mode | null;
    if (saved === "creator" || saved === "clipper") {
      setModeState(saved);
    }
    setLoaded(true);
  }, []);

  function setMode(newMode: Mode) {
    setModeState(newMode);
    localStorage.setItem("platform-mode", newMode);
  }

  function toggleMode() {
    setMode(mode === "creator" ? "clipper" : "creator");
  }

  if (!loaded) return <>{children}</>;

  return (
    <ModeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
