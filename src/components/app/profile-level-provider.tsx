"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Level } from "@/src/lib/prisma";
import { LevelModal } from "./level-modal";

type ProfileLevelContextValue = {
  level: Level | null;
  setLevel: (level: Level) => void;
  openLevel: () => void;
};

const ProfileLevelContext = createContext<ProfileLevelContextValue | null>(
  null,
);

export function useProfileLevel(): ProfileLevelContextValue {
  const ctx = useContext(ProfileLevelContext);
  if (!ctx) throw new Error("useProfileLevel fora do ProfileLevelProvider");
  return ctx;
}

// Fonte unica do nivel do perfil no cliente: a modal de nivel e o combo da
// nova atividade leem e gravam aqui, entao uma abre com o que a outra salvou.
export function ProfileLevelProvider({
  initialLevel,
  children,
}: {
  initialLevel: Level | null;
  children: React.ReactNode;
}) {
  const [level, setLevel] = useState<Level | null>(initialLevel);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLevel(initialLevel);
  }, [initialLevel]);

  const openLevel = useCallback(() => setOpen(true), []);
  const value = useMemo(
    () => ({ level, setLevel, openLevel }),
    [level, openLevel],
  );

  return (
    <ProfileLevelContext.Provider value={value}>
      {children}
      <LevelModal
        open={open}
        onOpenChange={setOpen}
        level={level}
        onSaved={setLevel}
      />
    </ProfileLevelContext.Provider>
  );
}
