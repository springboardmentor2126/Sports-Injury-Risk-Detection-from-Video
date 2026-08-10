import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      // Single-athlete scope: every account IS an athlete now, backend's
      // UserCreate schema doesn't have a role field anymore -- nothing to
      // pass here.
      await register({ full_name: fullName, email, password });
      navigate("/dashboard");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-track-slate px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-2xl font-semibold">
            Create your <span className="text-pulse-cyan">account</span>
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Set up access to the injury risk platform
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-line bg-court-graphite p-6"
        >
          <div>
            <label htmlFor="full_name" className="mb-1 block text-sm text-text-muted">
              Full name
            </label>
            <input
              id="full_name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-line bg-track-slate px-3 py-2 text-sm text-text-primary outline-none focus:border-pulse-cyan"
            />
          </div>

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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-track-slate px-3 py-2 text-sm text-text-primary outline-none focus:border-pulse-cyan"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="mb-1 block text-sm text-text-muted">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-track-slate px-3 py-2 text-sm text-text-primary outline-none focus:border-pulse-cyan"
            />
          </div>

          {error && <p className="text-sm text-risk-high">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-pulse-cyan px-3 py-2 text-sm font-semibold text-track-slate transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Creating account…" : "Register"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link to="/login" className="text-pulse-cyan hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
