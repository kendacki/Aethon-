import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { styled } from "../stitches.config";
import { ConnectButton } from "./ConnectButton";
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
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  gap: "$4",
});

const Links = styled("div", {
  display: "none",
  alignItems: "center",
  justifyContent: "center",
  gap: "$1",
  justifySelf: "center",
  "@md": { display: "flex" },
});

const NavAction = styled("div", {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: "$2",
  justifySelf: "end",
});

const LogoLink = styled(Link, {
  display: "flex",
  alignItems: "center",
  justifySelf: "start",
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

const MenuBtn = styled("button", {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: "5px",
  width: 36,
  height: 36,
  padding: 8,
  background: "transparent",
  border: "1px solid $border",
  borderRadius: "$md",
  cursor: "pointer",
  "@md": { display: "none" },
});

const MenuBar = styled("span", {
  display: "block",
  height: 2,
  width: "100%",
  background: "$text",
  borderRadius: 1,
});

const MobileDrawer = styled(motion.div, {
  position: "fixed",
  inset: 0,
  zIndex: 150,
  background: "rgba(0,0,0,0.55)",
});

const MobilePanel = styled(motion.div, {
  position: "absolute",
  top: 0,
  right: 0,
  width: "min(18rem, 85vw)",
  height: "100%",
  background: "$bg",
  borderLeft: "1px solid $border",
  padding: "$6 $5",
  display: "flex",
  flexDirection: "column",
  gap: "$2",
});

const MobileNavLink = styled(Link, {
  fontSize: "$md",
  fontWeight: "$semibold",
  padding: "$3 $4",
  borderRadius: "$md",
  color: "$text",
  opacity: 0.85,
  "&[data-active=true]": {
    background: "$bgGlass",
    opacity: 1,
  },
});

const links = [
  { to: "/", label: "Overview" },
  { to: "/agents", label: "Agents" },
  { to: "/tasks", label: "Tasks" },
  { to: "/somnia", label: "Somnia" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/governance", label: "Governance" },
];

function isActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function Navbar() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <Nav>
        <Inner>
          <LogoLink to="/" onClick={() => setMenuOpen(false)}>
            <AethonLogo height={40} />
          </LogoLink>
          <Links>
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} data-active={isActive(pathname, l.to)}>
                {l.label}
              </NavLink>
            ))}
          </Links>
          <NavAction>
            <MenuBtn type="button" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
              <MenuBar />
              <MenuBar />
              <MenuBar />
            </MenuBtn>
            <ConnectButton />
          </NavAction>
        </Inner>
      </Nav>

      <AnimatePresence>
        {menuOpen && (
          <MobileDrawer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
          >
            <MobilePanel
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={spring}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: "1rem", fontWeight: 700, opacity: 0.72, fontSize: "0.75rem", letterSpacing: "0.08em" }}>
                NAVIGATION
              </div>
              {links.map((l) => (
                <MobileNavLink
                  key={l.to}
                  to={l.to}
                  data-active={isActive(pathname, l.to)}
                  onClick={() => setMenuOpen(false)}
                >
                  {l.label}
                </MobileNavLink>
              ))}
            </MobilePanel>
          </MobileDrawer>
        )}
      </AnimatePresence>
    </>
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
        <AethonLogo height={72} />
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
