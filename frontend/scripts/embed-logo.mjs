import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const png = fs.readFileSync(path.join(__dirname, "../public/logo-an-source.png")).toString("base64");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="80 60 360 320">
  <defs>
    <filter id="whiteLogo" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -1 -1 -1 0 1"/>
    </filter>
  </defs>
  <image href="data:image/png;base64,${png}" width="512" height="400" filter="url(#whiteLogo)" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
fs.writeFileSync(path.join(__dirname, "../public/logo-white.svg"), svg);
console.log("logo-white.svg written", svg.length, "bytes");
