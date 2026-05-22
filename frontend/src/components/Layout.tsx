import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { styled } from "../stitches.config";
import { Button } from "./ui";
import { AethonLogo } from "./Logo";
import { spring } from "../stitches.config";

const Nav = styled("nav", {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 100,
  padding: "$4 $6",
  background: "rgba(0,0,0,0.92)",
  borderBottom: "1px solid $border",
});

const Inner = styled("div", {
  maxWidth: "1200px",
  margin: "0 auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "$6",
});

const Links = styled("div", {
  display: "none",
  alignItems: "center",
  gap: "$1",
  "@md": { display: "flex" },
});

const NavLink = styled(Link, {
  fontSize: "$sm",
  fontWeight: "$medium",
  padding: "$2 $4",
  borderRadius: "$pill",
  color: "$text",
  opacity: 0.72,
  transition: "all $fast",
  "&:hover, &[data-active=true]": {
    color: "$text",
    opacity: 1,
    background: "$bgGlass",
  },
  variants: {
    active: {
      true: { color: "$text", opacity: 1, background: "rgba(255,255,255,0.1)" },
    },
  },
});

const LogoLink = styled(Link, { display: "flex", alignItems: "center" });

const links = [
  { to: "/", label: "Overview" },
  { to: "/agents", label: "Agents" },
  { to: "/tasks", label: "Tasks" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/governance", label: "Governance" },
];

export function Navbar() {
  const { pathname } = useLocation();
  return (
    <Nav>
      <Inner>
        <LogoLink to="/">
          <AethonLogo height={32} />
        </LogoLink>
        <Links>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} data-active={pathname === l.to || (l.to !== "/" && pathname.startsWith(l.to))}>
              {l.label}
            </NavLink>
          ))}
        </Links>
        <Button variant="outline" size="sm" as={Link} to="/tasks">
          Launch Swarm
        </Button>
      </Inner>
    </Nav>
  );
}

export function LoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        gap: "1.5rem",
      }}
    >
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <AethonLogo height={56} />
      </motion.div>
      <motion.div
        style={{ width: 120, height: 2, background: "rgba(255,255,255,0.12)", borderRadius: 999, overflow: "hidden" }}
      >
        <motion.div
          style={{ height: "100%", background: "#FFFFFF", borderRadius: 999, width: "40%" }}
          animate={{ x: ["-100%", "250%"] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </motion.div>
  );
}

const ToastWrap = styled(motion.div, {
  position: "fixed",
  top: "5rem",
  right: "$6",
  zIndex: 200,
  padding: "$4 $5",
  borderRadius: "$lg",
  background: "$bg",
  border: "1px solid $border",
  maxWidth: "22rem",
  fontSize: "$sm",
  color: "$text",
});

export function Notification({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <AnimatePresence>
      {message && (
        <ToastWrap
          initial={{ opacity: 0, x: 40, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.95 }}
          transition={spring}
          onClick={onClose}
        >
          {message}
        </ToastWrap>
      )}
    </AnimatePresence>
  );
}
