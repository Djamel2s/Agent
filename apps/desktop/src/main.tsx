import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

if (window.agentNative) document.documentElement.classList.add("native");
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
