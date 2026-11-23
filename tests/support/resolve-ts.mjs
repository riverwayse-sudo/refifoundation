// Shared hook for the unit tests.
//
// The application source uses extensionless relative imports, which Next.js
// resolves and plain Node does not. This hook appends `.ts` for those imports, so
// the tests exercise the same files the build does instead of a copy.
//
// `server-only` is a build-time guard package that throws when imported outside a
// React server component. In a Node test it is not meaningful, so it resolves to
// an empty module rather than failing every import chain that passes through it.
import { registerHooks } from "node:module";

let installed = false;

export function installTsHooks() {
  if (installed) return;
  installed = true;
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "server-only") {
        return { url: "data:text/javascript,export{}", shortCircuit: true };
      }
      if (specifier.startsWith(".") && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(specifier)) {
        try {
          return nextResolve(`${specifier}.ts`, context);
        } catch {
          // fall through to the default resolution
        }
      }
      return nextResolve(specifier, context);
    },
  });
}
