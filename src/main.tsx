import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./index.css";

(window as any).__pwaInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  (window as any).__pwaInstallPrompt = e;
  window.dispatchEvent(new Event("pwa-prompt-ready"));
});

createRoot(document.getElementById("root")!).render(<App />);