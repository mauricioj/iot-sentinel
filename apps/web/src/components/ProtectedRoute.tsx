import { Navigate } from "react-router-dom";
import { getAccessToken, getRefreshToken } from "../api/auth";

type Props = { children: JSX.Element };

export function ProtectedRoute({ children }: Props) {
  const allowed = Boolean(getAccessToken() && getRefreshToken());
  if (!allowed) return <Navigate to="/login" replace />;
  return children;
}
