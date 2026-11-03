import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./macintosh.css";
import "./compactMuseum.css";
import "./pcxt.css";
import "./windows9x.css";
import "./windows9xExport.css";

const root = document.getElementById("root");
if (!root) throw new Error("RetroVerse mount point not found");
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
