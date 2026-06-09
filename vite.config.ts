// @lovable.dev/vite-tanstack-config already includes TanStack Start, React, Tailwind, etc.
// Nitro with `vercel` preset is required for Vercel deployment (SSR, not static dist/client).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    preset: "vercel",
  },
});
