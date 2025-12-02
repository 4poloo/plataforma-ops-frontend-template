import { useEffect, useState } from "react";

const STORAGE_KEY = "sidebar:expanded";

export function useSidebar(initial = true) {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === null ? initial : raw === "true";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isExpanded));
  }, [isExpanded]);

  const toggle = () => setIsExpanded(v => !v);
  const expand = () => setIsExpanded(true);
  const collapse = () => setIsExpanded(false);

  return { isExpanded, toggle, expand, collapse };
}
