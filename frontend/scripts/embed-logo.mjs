import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const png = fs.readFileSync(path.join(__dirname, "../public/logo-white.png")).toString("base64");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 693">
  <image href="data:image/png;base64,${png}" width="1024" height="693" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
fs.writeFileSync(path.join(__dirname, "../public/logo-white.svg"), svg);
console.log("logo-white.svg written", svg.length, "bytes");
