import { clearTokens, getAccessToken, getRefreshToken, setAccessToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type HttpMethod = "GET" | "POST" | "PUT";

async function request<T>(
  path: string,
  method: HttpMethod,
  body?: unknown,
  retry = true
): Promise<T> {
  const accessToken = getAccessToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json"
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (response.status === 401 && retry) {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      throw new Error("Unauthorized");
    }

    const refreshed = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken })
    });
    if (!refreshed.ok) {
      clearTokens();
      throw new Error("Session expired");
    }

    const data = (await refreshed.json()) as { accessToken: string };
    setAccessToken(data.accessToken);
    return request<T>(path, method, body, false);
  }

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path, "GET"),
  post: <T>(path: string, body?: unknown) => request<T>(path, "POST", body),
  put: <T>(path: string, body?: unknown) => request<T>(path, "PUT", body)
};
