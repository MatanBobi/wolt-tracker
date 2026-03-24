import { readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
const buildHash = createHash("md5")
  .update(Date.now().toString())
  .digest("hex")
  .slice(0, 8);

const version = `${pkg.version}-${buildHash}`;

const swPath = join(root, "public", "sw.js");
let sw = readFileSync(swPath, "utf-8");
sw = sw.replace("__SW_VERSION__", version);
writeFileSync(swPath, sw, "utf-8");

console.log(`Stamped sw.js with version: ${version}`);
