"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "sidebar-collapsed:v1";

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "true";
  } catch {
    return false;
  }
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);

  useEffect(() => {
    setCollapsedState(readStored());
  }, []);

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ collapsed, setCollapsed, toggle }),
    [collapsed, setCollapsed, toggle]
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

const defaultSidebarValue: SidebarContextValue = {
  collapsed: false,
  setCollapsed: () => {},
  toggle: () => {},
};

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  return ctx ?? defaultSidebarValue;
}

export function useSidebarOptional(): SidebarContextValue | null {
  return useContext(SidebarContext);
}
