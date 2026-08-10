import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-track-slate text-center">
      <p className="font-display text-3xl font-semibold">Page not found</p>
      <p className="text-sm text-text-muted">There's nothing at this address.</p>
      <Link to="/" className="text-sm text-pulse-cyan hover:underline">
        Back to home
      </Link>
    </div>
  );
}
