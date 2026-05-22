import { globalCss } from "./stitches.config";

export const globalStyles = globalCss({
  "*": { boxSizing: "border-box", margin: 0, padding: 0 },
  "html, body, #root": { height: "100%" },
  body: {
    fontFamily: "$sans",
    background: "$bg",
    color: "$text",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    lineHeight: 1.6,
  },
  a: { color: "inherit", textDecoration: "none" },
  button: { fontFamily: "inherit", cursor: "pointer", border: "none", background: "none", color: "$text" },
  "::selection": { background: "rgba(255,255,255,0.25)", color: "$text" },
});
