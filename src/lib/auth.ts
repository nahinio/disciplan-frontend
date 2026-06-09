const TOKEN_KEY = "disciplan_access_token";
const REFRESH_KEY = "disciplan_refresh_token";
const SIGNUP_KEY = "disciplan_signup";

export interface SignupDraft {
  email: string;
  code: string;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getSignupDraft(): SignupDraft | null {
  try {
    const raw = sessionStorage.getItem(SIGNUP_KEY);
    return raw ? (JSON.parse(raw) as SignupDraft) : null;
  } catch {
    return null;
  }
}

export function setSignupDraft(draft: SignupDraft) {
  sessionStorage.setItem(SIGNUP_KEY, JSON.stringify(draft));
}

export function clearSignupDraft() {
  sessionStorage.removeItem(SIGNUP_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}
