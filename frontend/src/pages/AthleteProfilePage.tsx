import { useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { AthleteProfile, AthleteProfileUpdate } from "../types";

export function AthleteProfilePage() {
  const { user } = useAuth();

  if (user?.role === "athlete") {
    return <OwnProfileForm />;
  }
  return <RosterTable />;
}

function OwnProfileForm() {
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [form, setForm] = useState<AthleteProfileUpdate>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    api.get<AthleteProfile>("/athletes/me").then((res) => {
      setProfile(res.data);
      setForm(res.data);
    });
  }, []);

  function update<K extends keyof AthleteProfileUpdate>(key: K, value: AthleteProfileUpdate[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    try {
      const { data } = await api.put<AthleteProfile>("/athletes/me", form);
      setProfile(data);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }

  if (!profile) {
    return <p className="text-sm text-text-muted">Loading profile…</p>;
  }

  return (
    <div className="max-w-2xl">
      <p className="font-display text-2xl font-semibold">Athlete profile</p>
      <p className="mb-6 text-sm text-text-muted">
        This data feeds directly into the injury risk model — keep it current.
      </p>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Sport" value={form.sport} onChange={(v) => update("sport", v)} />
        <TextField label="Position" value={form.position} onChange={(v) => update("position", v)} />
        <TextField label="Gender" value={form.gender} onChange={(v) => update("gender", v)} />
        <NumberField label="Age" value={form.age} onChange={(v) => update("age", v)} />
        <NumberField label="Height (cm)" value={form.height} onChange={(v) => update("height", v)} />
        <NumberField label="Weight (kg)" value={form.weight} onChange={(v) => update("weight", v)} />
        <TextField
          label="Training load"
          value={form.training_load}
          onChange={(v) => update("training_load", v)}
        />
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-text-muted">Injury history</label>
          <textarea
            value={form.injury_history ?? ""}
            onChange={(e) => update("injury_history", e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-line bg-court-graphite px-3 py-2 text-sm text-text-primary outline-none focus:border-pulse-cyan"
          />
        </div>

        <div className="flex items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={status === "saving"}
            className="rounded-lg bg-pulse-cyan px-4 py-2 text-sm font-semibold text-track-slate transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {status === "saving" ? "Saving…" : "Save changes"}
          </button>
          {status === "saved" && <span className="text-sm text-risk-low">Saved.</span>}
          {status === "error" && <span className="text-sm text-risk-high">Couldn't save. Try again.</span>}
        </div>
      </form>
    </div>
  );
}

function RosterTable() {
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);

  useEffect(() => {
    api.get<AthleteProfile[]>("/athletes/").then((res) => setAthletes(res.data));
  }, []);

  return (
    <div>
      <p className="font-display text-2xl font-semibold">Athletes</p>
      <p className="mb-6 text-sm text-text-muted">{athletes.length} profiles</p>

      <div className="overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-court-graphite text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-4 py-3">Sport</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Training load</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map((a) => (
              <tr key={a.athlete_id} className="border-t border-line">
                <td className="px-4 py-3">{a.sport ?? "—"}</td>
                <td className="px-4 py-3">{a.position ?? "—"}</td>
                <td className="px-4 py-3 font-data">{a.age ?? "—"}</td>
                <td className="px-4 py-3">{a.training_load ?? "—"}</td>
              </tr>
            ))}
            {athletes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-muted">
                  No athletes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-text-muted">{label}</label>
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-court-graphite px-3 py-2 text-sm text-text-primary outline-none focus:border-pulse-cyan"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-text-muted">{label}</label>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-line bg-court-graphite px-3 py-2 text-sm text-text-primary font-data outline-none focus:border-pulse-cyan"
      />
    </div>
  );
}
