import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Navbar, LoadingScreen } from "./components/Layout";
import { SiteFooter } from "./components/Footer";
import { spring } from "./stitches.config";
import OverviewPage from "./pages/Overview";
import AgentsPage from "./pages/Agents";
import AgentDetailPage from "./pages/AgentDetail";
import TasksPage from "./pages/Tasks";
import CoalitionDetailPage from "./pages/CoalitionDetail";
import LeaderboardPage from "./pages/Leaderboard";
import GovernancePage from "./pages/Governance";
import { styled } from "./stitches.config";

const Shell = styled("div", {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  background: "$bg",
});

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={spring}
        style={{ flex: 1 }}
      >
        <Routes location={location}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/agents/:addr" element={<AgentDetailPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/coalitions/:addr" element={<CoalitionDetailPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/governance" element={<GovernancePage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <BrowserRouter>
      <Shell>
        <AnimatePresence>{loading && <LoadingScreen key="loader" />}</AnimatePresence>
        {!loading && (
          <>
            <Navbar />
            <AnimatedRoutes />
            <SiteFooter />
          </>
        )}
      </Shell>
    </BrowserRouter>
  );
}
