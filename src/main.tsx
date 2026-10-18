import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./styles.css";
import "./zen.css";
import "./ecobrutalism.css";

registerSW({
  onRegisterError(error) {
    console.warn("Mode hors ligne indisponible", error);
  },
});
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
