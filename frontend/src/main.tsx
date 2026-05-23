import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { globalStyles } from "./globalStyles";
import { WalletProvider } from "./wallet/WalletContext";

globalStyles();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </React.StrictMode>
);
