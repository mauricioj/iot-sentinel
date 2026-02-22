import { FormEvent, useState } from "react";
import { useAuth } from "../hooks/useAuth";

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
    <main className="container">
      <h1>IoT Sentinel</h1>
      <form onSubmit={onSubmit} className="card">
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Senha</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <button type="submit">Entrar</button>
      </form>
    </main>
  );
}
