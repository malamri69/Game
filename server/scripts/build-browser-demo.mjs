import esbuild from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const serverDir = dirname(dirname(fileURLToPath(import.meta.url)));
const demoDir = join(serverDir, "..", "demo");

/**
 * Bundles the real game engine (state machine, roles, events, actions,
 * voting, resolution, AI — see src/browser-entry.ts) to run standalone in
 * a browser tab, then splices it into demo/play-template.html to produce
 * demo/play.html: a zero-server, click-through solo match against bots.
 * No gameplay logic is duplicated or reimplemented — it's the exact same
 * TypeScript the live server runs.
 *
 * The only thing that needs adapting for the browser is SecureRng's use
 * of node:crypto — this plugin swaps that one import for the equivalent
 * Web Crypto calls.
 */
const nodeCryptoBrowserShim = {
  name: "node-crypto-browser-shim",
  setup(build) {
    build.onResolve({ filter: /^node:crypto$/ }, () => ({ path: "node-crypto-shim", namespace: "shim" }));
    build.onLoad({ filter: /.*/, namespace: "shim" }, () => ({
      loader: "js",
      contents: `
        export function randomInt(min, max) {
          const range = max - min;
          const limit = Math.floor(0xffffffff / range) * range;
          const buf = new Uint32Array(1);
          let x;
          do {
            crypto.getRandomValues(buf);
            x = buf[0];
          } while (x >= limit);
          return min + (x % range);
        }
        export function randomUUID() {
          return crypto.randomUUID();
        }
      `
    }));
  }
};

const result = await esbuild.build({
  entryPoints: [join(serverDir, "src", "browser-entry.ts")],
  bundle: true,
  format: "iife",
  globalName: "UnknownKingEngine",
  platform: "browser",
  target: "es2020",
  write: false,
  plugins: [nodeCryptoBrowserShim]
});

const bundle = result.outputFiles[0].text;
if (bundle.includes("</script>")) {
  throw new Error("engine bundle unexpectedly contains a literal </script> — cannot inline safely");
}

const template = readFileSync(join(demoDir, "play-template.html"), "utf8");
if (!template.includes("/*__ENGINE_BUNDLE__*/")) {
  throw new Error("play-template.html is missing the /*__ENGINE_BUNDLE__*/ marker");
}
const page = template.replace("/*__ENGINE_BUNDLE__*/", bundle);

const outPath = join(demoDir, "play.html");
writeFileSync(outPath, page, "utf8");
console.log(`wrote ${outPath} (${page.length} bytes, engine bundle ${bundle.length} bytes)`);
