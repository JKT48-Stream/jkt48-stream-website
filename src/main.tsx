import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Tangkap beforeinstallprompt SEBELUM React render apapun
// Browser hanya menembak event ini sekali, sangat awal
(window as any).__pwaInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  (window as any).__pwaInstallPrompt = e;
  // Dispatch custom event agar siapapun yang sudah mount bisa tahu
  window.dispatchEvent(new Event("pwa-prompt-ready"));
});

createRoot(document.getElementById("root")!).render(<App />);