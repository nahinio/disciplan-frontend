const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";
const apiOrigin = apiBase.replace(/\/api\/v\d+\/?$/, "");

export const landingLinks = {
  apiDocs: `${apiOrigin}/docs`,
  openApi: `${apiOrigin}/openapi.json`,
  frontendRepo:
    import.meta.env.VITE_FRONTEND_REPO_URL ?? "https://github.com/nahinio/disciplan-frontend",
  backendRepo:
    import.meta.env.VITE_BACKEND_REPO_URL ?? "https://github.com/nahinio/disciplan-backend",
} as const;
