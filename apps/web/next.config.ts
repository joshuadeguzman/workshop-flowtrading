import path from "node:path"
import { fileURLToPath } from "node:url"

import type { NextConfig } from "next"

const configDir = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  // Pin the workspace root to this monorepo (apps/web -> ../..). Without this,
  // Next can pick a stray parent lockfile as the root and resolve packages from
  // the wrong tree. Deterministic for both local dev and Vercel.
  turbopack: {
    root: path.join(configDir, "..", ".."),
  },
}

export default nextConfig
