import { globalCss } from "./stitches.config";

export const globalStyles = globalCss({
  "*": { boxSizing: "border-box", margin: 0, padding: 0 },
  "html, body, #root": { height: "100%" },
  body: {
    fontFamily: "$secondary",
    fontWeight: 400,
    background: "$bg",
    color: "$text",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    lineHeight: 1.6,
  },
  "h1, h2, h3, h4, h5, h6": {
    fontFamily: "$primary",
    fontWeight: 600,
  },
  a: { color: "inherit", textDecoration: "none" },
  button: { fontFamily: "inherit", cursor: "pointer", border: "none", background: "none", color: "$text" },
  "select, option, optgroup": {
    colorScheme: "dark",
  },
  option: {
    backgroundColor: "#0a0a0a",
    color: "#FFFFFF",
  },
  "::selection": { background: "rgba(255,255,255,0.25)", color: "$text" },
});
