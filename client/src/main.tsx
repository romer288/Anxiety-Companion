import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { SessionProvider } from "@/context/SessionContext";

createRoot(document.getElementById("root")!).render(
  <SessionProvider>
    <App />
  </SessionProvider>
);
