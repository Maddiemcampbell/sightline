"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type HeaderDropdownContextValue = Readonly<{
  activeId: string | null;
  setActiveId: (id: string | null) => void;
}>;

const HeaderDropdownContext = createContext<HeaderDropdownContextValue | null>(
  null,
);

export function HeaderDropdownProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <HeaderDropdownContext value={{ activeId, setActiveId }}>
      {children}
    </HeaderDropdownContext>
  );
}

export function useHeaderDropdown(id: string) {
  const context = useContext(HeaderDropdownContext);
  if (!context) {
    throw new Error(
      "useHeaderDropdown must be used within HeaderDropdownProvider.",
    );
  }

  const rootRef = useRef<HTMLDivElement>(null);
  const open = context.activeId === id;
  const setActiveId = context.setActiveId;

  useEffect(() => {
    if (!open) return;

    function closeOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setActiveId(null);
      }
    }

    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open, setActiveId]);

  return {
    rootRef,
    open,
    close: () => setActiveId(null),
    toggle: () => setActiveId(open ? null : id),
  } as const;
}
