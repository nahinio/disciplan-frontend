// @lovable.dev/vite-tanstack-config already includes TanStack Start, React, Tailwind, etc.
// Nitro must emit Vercel Build Output API v3 under `.vercel/output` (not dist/client).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    preset: "vercel",
    output: {
      dir: ".vercel/output",
      serverDir: ".vercel/output/functions/__server.func",
      publicDir: ".vercel/output/static",
    },
  },
});
