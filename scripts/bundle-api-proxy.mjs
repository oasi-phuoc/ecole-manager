/**
 * Bundle api-proxy pour deploy Supabase sans Docker.
 * Usage: node scripts/bundle-api-proxy.mjs
 */
import * as esbuild from "../supabase/functions/api-proxy/node_modules/esbuild/lib/main.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const fnDir = path.join(root, "supabase", "functions", "api-proxy");

await esbuild.build({
  entryPoints: [path.join(fnDir, "index.source.ts")],
  outfile: path.join(fnDir, "index.ts"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2022",
  minify: true,
  legalComments: "none",
  logLevel: "info",
  // Remplacer les imports Deno/npm pour le bundle Node local
  alias: {
    "jsr:@supabase/functions-js/edge-runtime.d.ts": path.join(fnDir, "edge-runtime-stub.js"),
  },
  banner: {
    js: "// Bundled by scripts/bundle-api-proxy.mjs — ne pas éditer directement",
  },
});

// Supabase Edge : Deno.serve uniquement, pas export default
let code = await import("node:fs").then((fs) =>
  fs.readFileSync(path.join(fnDir, "index.ts"), "utf8"),
);
code = code.replace(/export default ([\w$]+)\(\);?/g, "$1();");
await import("node:fs").then((fs) =>
  fs.writeFileSync(path.join(fnDir, "index.ts"), code),
);

console.log("Bundle OK → supabase/functions/api-proxy/index.ts");
