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
   - **Output directory:** `dist/client`
   - **Install command:** `npm install`

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

On Render, set `CORS_ORIGINS` to your Vercel URL:

```
https://your-project.vercel.app
```

Add multiple origins comma-separated if you use preview deployments.

## 5. After deploy

- Landing page: `https://your-project.vercel.app`
- API docs link in footer points to Render `/docs`
- Test login, dashboard, and chat on the live URL

## 6. TanStack Start note

This app uses TanStack Start with Vite. If Vercel reports a missing entry, switch the framework preset to **Other** and keep the build command from `vercel.json`. For full SSR, see [TanStack Start hosting docs](https://tanstack.com/start/latest/docs/framework/react/hosting).
