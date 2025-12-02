import { useEffect, useState } from "react";

export function useCollapse(storageKey: string, initial = true) {
  const key = `sidebar:group:${storageKey}`;
  const [open, setOpen] = useState<boolean>(() => {
    const raw = localStorage.getItem(key);
    return raw === null ? initial : raw === "true";
  });

  useEffect(() => {
    localStorage.setItem(key, String(open));
  }, [key, open]);

  const toggle = () => setOpen(v => !v);
  return { open, toggle, setOpen };
}
