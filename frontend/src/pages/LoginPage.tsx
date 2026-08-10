import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch {
      setError("Incorrect email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-track-slate px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-2xl font-semibold">
            Injury Risk <span className="text-pulse-cyan">Detection</span>
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Sign in to your athlete or staff account
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-line bg-court-graphite p-6"
        >
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-text-muted">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line bg-track-slate px-3 py-2 text-sm text-text-primary outline-none focus:border-pulse-cyan"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-text-muted">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-track-slate px-3 py-2 text-sm text-text-primary outline-none focus:border-pulse-cyan"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-risk-high">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-pulse-cyan px-3 py-2 text-sm font-semibold text-track-slate transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-text-muted">
          Don't have an account?{" "}
          <Link to="/register" className="text-pulse-cyan hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
