import { AnimatePresence, motion } from "framer-motion";
import { Routes, Route, useLocation } from "react-router-dom";
import { useSignedIn } from "../auth/useSignedIn";
import { pageTransition } from "../motion/overview";
import { styled } from "../stitches.config";
import { Navbar, LoadingScreen } from "./Layout";
import { SiteFooter } from "./Footer";
import { OperatorMobileNav } from "./session/OperatorMobileNav";
import OverviewPage from "../pages/Overview";
import AgentsPage from "../pages/Agents";
import AgentDetailPage from "../pages/AgentDetail";
import TasksPage from "../pages/Tasks";
import CoalitionDetailPage from "../pages/CoalitionDetail";
import LeaderboardPage from "../pages/Leaderboard";
import GovernancePage from "../pages/Governance";

const Main = styled("div", {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  variants: {
    operatorMobile: {
      true: {
        "@media (max-width: 1023px)": {
          paddingBottom: "1rem",
        },
      },
      false: {
        paddingBottom: "$6",
      },
    },
  },
  defaultVariants: {
    operatorMobile: false,
  },
});

const FooterWrap = styled("div", {
  variants: {
    operatorMobile: {
      true: {
        "@media (max-width: 1023px)": {
          paddingBottom: "5.25rem",
        },
      },
      false: {},
    },
  },
  defaultVariants: {
    operatorMobile: false,
  },
});

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} style={{ flex: 1 }} {...pageTransition}>
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

type AppShellProps = {
  loading: boolean;
};

export function AppShell({ loading }: AppShellProps) {
  const { signedIn } = useSignedIn();

  return (
    <>
      <AnimatePresence>{loading && <LoadingScreen key="loader" />}</AnimatePresence>
      {!loading && (
        <>
          <Navbar />
          <Main operatorMobile={signedIn}>
            <AnimatedRoutes />
          </Main>
          <FooterWrap operatorMobile={signedIn}>
            <SiteFooter />
          </FooterWrap>
          {signedIn && <OperatorMobileNav />}
        </>
      )}
    </>
  );
}
