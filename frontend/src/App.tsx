import { useState, useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { api } from "./api/client";
import { ToastProvider } from "./components/ToastProvider";
import { AppShell } from "./components/AppShell";
import { styled } from "./stitches.config";

const Shell = styled("div", {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  background: "$bg",
  position: "relative",
});

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setLoading(false);
      }
    };

    const minTimer = setTimeout(finish, 600);
    api.health().then(finish).catch(finish);

    return () => {
      clearTimeout(minTimer);
      done = true;
    };
  }, []);

  return (
    <BrowserRouter>
      <ToastProvider>
        <Shell>
          <AppShell loading={loading} />
        </Shell>
      </ToastProvider>
    </BrowserRouter>
  );
}
