import { createContext, useContext, useEffect, useState, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PWAContextValue {
  canInstall: boolean;
  isInstalled: boolean;
  installing: boolean;
  triggerInstall: () => Promise<void>;
}

const PWAContext = createContext<PWAContextValue>({
  canInstall: false,
  isInstalled: false,
  installing: false,
  triggerInstall: async () => {},
});

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [hasPrompt, setHasPrompt] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Cek standalone mode
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    if (standalone) {
      setIsInstalled(true);
      return;
    }

    // Ambil dari window jika sudah ditangkap di main.tsx sebelum React render
    const existing = (window as any).__pwaInstallPrompt as BeforeInstallPromptEvent | null;
    if (existing) {
      promptRef.current = existing;
      setHasPrompt(true);
    }

    // Dengarkan jika belum ada (race condition)
    const onPromptReady = () => {
      const p = (window as any).__pwaInstallPrompt as BeforeInstallPromptEvent | null;
      if (p) {
        promptRef.current = p;
        setHasPrompt(true);
      }
    };

    // Juga tangkap langsung jika masih belum terlambat
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as BeforeInstallPromptEvent;
      (window as any).__pwaInstallPrompt = e;
      setHasPrompt(true);
    };

    window.addEventListener("pwa-prompt-ready", onPromptReady);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setHasPrompt(false);
      promptRef.current = null;
      (window as any).__pwaInstallPrompt = null;
    });

    return () => {
      window.removeEventListener("pwa-prompt-ready", onPromptReady);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  const triggerInstall = async () => {
    const prompt = promptRef.current;
    if (!prompt) return;
    setInstalling(true);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setHasPrompt(false);
        promptRef.current = null;
        (window as any).__pwaInstallPrompt = null;
      }
    } finally {
      setInstalling(false);
    }
  };

  return (
    <PWAContext.Provider
      value={{
        canInstall: hasPrompt && !isInstalled,
        isInstalled,
        installing,
        triggerInstall,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}

export function usePWA() {
  return useContext(PWAContext);
}