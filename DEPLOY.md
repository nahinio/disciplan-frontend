# Deploy DisciPlan Frontend (Vercel)

Repository: [github.com/nahinio/disciplan-frontend](https://github.com/nahinio/disciplan-frontend)

## 1. Prerequisites

- Backend deployed on Render (see `disciplan-backend/DEPLOY.md`)
- Live API: `https://disciplan-backend-bufl.onrender.com`

## 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import **nahinio/disciplan-frontend** from GitHub
3. Framework preset: **Vite** (or auto-detected)
4. Build settings (from `vercel.json`):
   - **Build command:** `npm run build`
   - **Output directory:** `.vercel/output` (Vercel Build Output API v3)
   - **Install command:** `npm install`
   - **Framework preset:** Other (`framework: null` in `vercel.json`)

## 3. Environment variables

Add in Vercel → Project → Settings → Environment Variables:

| Variable | Example |
|----------|---------|
| `VITE_API_BASE_URL` | `https://disciplan-backend-bufl.onrender.com/api/v1` |
| `VITE_FRONTEND_REPO_URL` | `https://github.com/nahinio/disciplan-frontend` |
| `VITE_BACKEND_REPO_URL` | `https://github.com/nahinio/disciplan-backend` |

Apply to **Production**, **Preview**, and **Development**.

Redeploy after changing env vars (Vite bakes `VITE_*` at build time).

## 4. Update backend CORS

On Render, set `CORS_ORIGINS` to your Vercel URL (**no trailing slash**):

```
https://disciplan-frontend.vercel.app
```

A trailing slash (`...vercel.app/`) breaks login — the browser sends the origin without `/`, CORS blocks the response, and the UI shows "Could not sign in" even with valid credentials.

Add multiple origins comma-separated for preview deployments.

## 5. After deploy

- Landing page: `https://your-project.vercel.app`
- API docs link in footer points to Render `/docs`
- Test login, dashboard, and chat on the live URL

## 6. TanStack Start + Vercel (important)

This app is **TanStack Start with SSR**, not a static Vite SPA. `dist/client` has assets only (no `index.html`). Serving that folder alone causes Vercel **404 NOT_FOUND**.

`vite.config.ts` must emit Nitro output into `.vercel/output` (not `dist/client`):

```ts
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
```

`vercel.json` must point at that folder:

```json
{
  "framework": null,
  "outputDirectory": ".vercel/output"
}
```

After `npm run build`, verify locally: `.vercel/output/config.json`, `functions/`, and `static/` exist. Do **not** use `dist/client` as the output directory.

See [TanStack Start on Vercel](https://vercel.com/docs/frameworks/full-stack/tanstack-start).
