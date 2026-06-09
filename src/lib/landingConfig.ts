export const productionApi = {
  origin: "https://disciplan-backend-bufl.onrender.com",
  baseUrl: "https://disciplan-backend-bufl.onrender.com/api/v1",
} as const;

const apiBase = import.meta.env.VITE_API_BASE_URL ?? productionApi.baseUrl;
const apiOrigin = apiBase.replace(/\/api\/v\d+\/?$/, "") || productionApi.origin;

export const landingLinks = {
  apiRoot: productionApi.origin,
  apiDocs: `${apiOrigin}/docs`,
  openApi: `${apiOrigin}/openapi.json`,
  frontendRepo:
    import.meta.env.VITE_FRONTEND_REPO_URL ?? "https://github.com/nahinio/disciplan-frontend",
  backendRepo:
    import.meta.env.VITE_BACKEND_REPO_URL ?? "https://github.com/nahinio/disciplan-backend",
} as const;
