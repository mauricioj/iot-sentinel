import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "../api/auth";

export function useAuth() {
  const navigate = useNavigate();

  const isLogged = Boolean(getAccessToken() && getRefreshToken());

  async function login(email: string, password: string) {
    const data = await api.post<{ accessToken: string; refreshToken: string }>("/auth/login", {
      email,
      password
    });
    setTokens(data.accessToken, data.refreshToken);
    navigate("/discovered-hosts");
  }

  async function logout() {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await api.post("/auth/logout", { refreshToken });
    }
    clearTokens();
    navigate("/login");
  }

  return { isLogged, login, logout };
}
