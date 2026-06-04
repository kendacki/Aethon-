import { Link, useLocation } from "react-router-dom";
import { styled } from "../../stitches.config";
import { isNavActive } from "../../config/navigation";
import { IconAgent, IconHome, IconShield, IconTask } from "../icons";

const OPERATOR_LINKS = [
  { to: "/", label: "Home", Icon: IconHome },
  { to: "/tasks", label: "Tasks", Icon: IconTask },
  { to: "/agents", label: "Fleet", Icon: IconAgent },
  { to: "/governance", label: "Safety", Icon: IconShield },
] as const;

const Dock = styled("nav", {
  display: "flex",
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 95,
  padding: "$2 $3 calc($3 + env(safe-area-inset-bottom, 0px))",
  background: "rgba(0, 0, 0, 0.94)",
  borderTop: "1px solid rgba(13, 188, 130, 0.28)",
  backdropFilter: "blur(14px)",
  "@lg": {
    display: "none",
  },
});

const DockInner = styled("div", {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "$1",
  maxWidth: "480px",
  margin: "0 auto",
  width: "100%",
});

const DockLink = styled(Link, {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.2rem",
  padding: "$2 $1",
  borderRadius: "$md",
  fontSize: "0.625rem",
  fontWeight: 600,
  letterSpacing: "0.02em",
  color: "$text",
  opacity: 0.62,
  textDecoration: "none",
  transition: "opacity 150ms ease, background 150ms ease",
  minHeight: "3rem",
  "&[data-active=true]": {
    opacity: 1,
    background: "rgba(13, 188, 130, 0.14)",
    boxShadow: "inset 0 0 0 1px rgba(13, 188, 130, 0.35)",
  },
  "&:active": {
    transform: "scale(0.97)",
  },
});

export function OperatorMobileNav() {
  const { pathname } = useLocation();

  return (
    <Dock aria-label="Operator navigation">
      <DockInner>
        {OPERATOR_LINKS.map(({ to, label, Icon }) => {
          const active = isNavActive(pathname, to);
          return (
            <DockLink key={to} to={to} data-active={active} aria-current={active ? "page" : undefined}>
              <Icon size={20} />
              <span>{label}</span>
            </DockLink>
          );
        })}
      </DockInner>
    </Dock>
  );
}
