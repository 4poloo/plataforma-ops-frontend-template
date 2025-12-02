// src/global/components/FlashBanner.tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type FlashBannerType = "success" | "error" | "info";

type FlashBannerMessage = {
  id: number;
  text: string;
  type: FlashBannerType;
};

type FlashBannerContextValue = {
  showMessage: (text: string, type?: FlashBannerType) => void;
};

const FlashBannerContext = createContext<FlashBannerContextValue | null>(null);

export function FlashBannerProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<FlashBannerMessage[]>([]);

  const showMessage = useCallback((text: string, type: FlashBannerType = "info") => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), text, type },
    ]);
  }, []);

  const remove = useCallback((id: number) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    const timer = setTimeout(() => {
      remove(messages[0]?.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [messages, remove]);

  const contextValue = useMemo(() => ({ showMessage }), [showMessage]);

  return (
    <FlashBannerContext.Provider value={contextValue}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-16 z-[1000] flex w-full max-w-2xl -translate-x-1/2 flex-col gap-2 px-4">
        {messages.map((msg) => {
          const base =
            msg.type === "success"
              ? "bg-emerald-100 text-emerald-900 border-emerald-200"
              : msg.type === "error"
                ? "bg-red-100 text-red-900 border-red-200"
                : "bg-blue-100 text-blue-900 border-blue-200";
          return (
            <div
              key={msg.id}
              className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow ${base}`}
            >
              {msg.text}
            </div>
          );
        })}
      </div>
    </FlashBannerContext.Provider>
  );
}

export function useFlashBanner() {
  const ctx = useContext(FlashBannerContext);
  if (!ctx) throw new Error("useFlashBanner debe usarse dentro de FlashBannerProvider");
  const { showMessage } = ctx;
  return {
    showSuccess: (text: string) => showMessage(text, "success"),
    showError: (text: string) => showMessage(text, "error"),
    showInfo: (text: string) => showMessage(text, "info"),
  };
}
