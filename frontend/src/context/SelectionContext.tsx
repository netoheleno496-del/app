import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { storage } from "@/src/utils/storage";

const SELECTED_KEY = "peixe_selected_bankroll";

interface SelectionState {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}

const SelectionContext = createContext<SelectionState | undefined>(undefined);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedId, setSelectedIdState] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const stored = await storage.getItem<string>(SELECTED_KEY, "");
      if (stored) setSelectedIdState(stored);
    })();
  }, []);

  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdState(id);
    if (id) storage.setItem(SELECTED_KEY, id);
    else storage.removeItem(SELECTED_KEY);
  }, []);

  return (
    <SelectionContext.Provider value={{ selectedId, setSelectedId }}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used within SelectionProvider");
  return ctx;
}
