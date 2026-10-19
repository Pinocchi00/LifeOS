import React from "react";
import ReactDOM from "react-dom/client";
import { startWorker } from "./experience/pwa";
import App from "./App";
import "./styles.css";
import "./zen.css";
import "./ecobrutalism.css";
import "./living-garden.css";
import "./planning.css";

startWorker();
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
