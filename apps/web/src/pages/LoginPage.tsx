import { FormEvent, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { useI18n } from "../i18n";

export function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      setError(null);
      await login(email, password);
    } catch (error) {
      setError((error as Error).message || t("login.error"));
    }
  }

  return (
    <main className="login-shell">
      <form onSubmit={onSubmit} className="login-card">
        <img src="/brand/logo.png" alt="IoT Sentinel" className="login-logo" />
        <h1>IoT Sentinel</h1>
        <p>{t("login.subtitle")}</p>
        <label>{t("login.email")}</label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>{t("login.password")}</label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <Button type="submit">{t("login.submit")}</Button>
      </form>
    </main>
  );
}
