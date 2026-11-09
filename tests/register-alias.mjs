import fs from "node:fs";
import path from "node:path";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(import.meta.dirname, "..");

function resolveFileCandidate(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.mjs`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
    path.join(basePath, "index.js"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return pathToFileURL(candidate).href;
    }
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      context.parentURL?.includes("/node_modules/") ||
      context.parentURL?.includes("\\node_modules\\")
    ) {
      return nextResolve(specifier, context);
    }

    if (specifier === "next/server") {
      const nextServerJs = path.join(repoRoot, "node_modules", "next", "server.js");
      return nextResolve(pathToFileURL(nextServerJs).href, context);
    }

    if (specifier.startsWith("@/")) {
      const target = path.join(repoRoot, specifier.slice(2));
      const resolvedUrl = resolveFileCandidate(target);
      if (resolvedUrl) {
        return nextResolve(resolvedUrl, context);
      }
    }

    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL?.startsWith("file://")
    ) {
      const parentDir = path.dirname(
        new URL(context.parentURL).pathname.replace(/^\/([A-Za-z]:)/, "$1")
      );
      const target = path.resolve(parentDir, specifier);
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
        const resolvedUrl = resolveFileCandidate(target);
        if (resolvedUrl) {
          return nextResolve(resolvedUrl, context);
        }
      }
    }

    return nextResolve(specifier, context);
  },
});
