import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/jetbrains-mono";
import "./index.css";
import { App } from "./App";
import { BrowserRouter } from "react-router";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Elemen #root tidak ditemukan di index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
