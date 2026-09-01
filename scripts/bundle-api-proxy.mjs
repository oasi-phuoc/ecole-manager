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
  plugins: [
    {
      name: "external-node-builtins",
      setup(build) {
        build.onResolve({ filter: /^node:/ }, (args) => ({
          path: args.path,
          external: true,
        }));
        build.onResolve({ filter: /^npm:/ }, (args) => ({
          path: args.path,
          external: true,
        }));
      },
    },
  ],
  // Remplacer les imports Deno/npm pour le bundle Node local
  alias: {
    "jsr:@supabase/functions-js/edge-runtime.d.ts": path.join(fnDir, "edge-runtime-stub.js"),
  },
  banner: {
    js: `// Bundled by scripts/bundle-api-proxy.mjs
try {
  var p = globalThis.process;
  if (p && !p.binding) {
    p.binding = function (n) {
      return n === "tty_wrap" ? { guessHandleType: function () { return "PIPE"; } } : {};
    };
  }
} catch (e) {}`,
  },
});

// Supabase Edge : Deno.serve uniquement, pas export default
let code = await import("node:fs").then((fs) =>
  fs.readFileSync(path.join(fnDir, "index.ts"), "utf8"),
);
code = code.replace(/export default ([\w$]+)\(\);?/g, "$1();");
code = code.replace(
  /throw Error\('Dynamic require of "'\+i\+'" is not supported'\)/g,
  "return globalThis.__esbuildRequire(i)",
);
await import("node:fs").then((fs) =>
  fs.writeFileSync(path.join(fnDir, "index.ts"), code),
);

console.log("Bundle OK → supabase/functions/api-proxy/index.ts");
