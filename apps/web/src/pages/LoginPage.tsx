import { FormEvent, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      setError(null);
      await login(email, password);
    } catch {
      setError("Falha no login");
    }
  }

  return (
    <main className="login-shell">
      <form onSubmit={onSubmit} className="login-card">
        <img src="/brand/logo.png" alt="IoT Sentinel" className="login-logo" />
        <h1>IoT Sentinel</h1>
        <p>Plataforma de gerenciamento e monitoramento IoT</p>
        <label>Email</label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Senha</label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <Button type="submit">Entrar</Button>
      </form>
    </main>
  );
}
