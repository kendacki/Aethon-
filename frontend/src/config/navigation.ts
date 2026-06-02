export type NavItem = {
  to: string;
  label: string;
};

/** Primary site navigation — single source of truth for navbar and footer. */
export const MAIN_NAV: NavItem[] = [
  { to: "/", label: "Overview" },
  { to: "/agents", label: "Agents" },
  { to: "/tasks", label: "Tasks" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/governance", label: "Governance" },
];

export function isNavActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}
