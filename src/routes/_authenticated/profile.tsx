import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Activity, ArrowLeft, Loader2, LogOut } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Partial<Tables<"profiles">>;

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Athlete profile — KinetIQ" },
      { name: "description", content: "Manage your athlete profile: sport, position, physical stats, and training background." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext() as { user: { id: string; email?: string } };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [p, setP] = useState<Profile>({});

  useEffect(() => {
    (async () => {
      const [{ data: prof }, { data: rs }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      if (prof) setP(prof);
      setRoles((rs ?? []).map((r) => r.role as string));
      setLoading(false);
    })();
  }, [user.id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      id: user.id,
      full_name: p.full_name ?? null,
      display_name: p.display_name ?? null,
      date_of_birth: p.date_of_birth ?? null,
      gender: p.gender ?? null,
      height_cm: p.height_cm ?? null,
      weight_kg: p.weight_kg ?? null,
      dominant_side: p.dominant_side ?? null,
      primary_sport: p.primary_sport ?? null,
      position: p.position ?? null,
      experience_years: p.experience_years ?? null,
      training_frequency: p.training_frequency ?? null,
      injury_history: p.injury_history ?? null,
      goals: p.goals ?? null,
    };
    const { error } = await supabase.from("profiles").upsert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <span className="font-semibold tracking-tight">KinetIQ</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Analysis</Button></Link>
            <Button variant="outline" size="sm" onClick={signOut}><LogOut className="h-4 w-4 mr-1" />Sign out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Athlete profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Signed in as <span className="font-mono">{user.email}</span>
            {roles.length > 0 && <> · role: <span className="text-primary font-medium">{roles.join(", ")}</span></>}
          </p>
        </div>

        <form onSubmit={save} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Identity</CardTitle><CardDescription>Basic information</CardDescription></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Full name"><Input value={p.full_name ?? ""} onChange={(e) => setP({ ...p, full_name: e.target.value })} /></Field>
              <Field label="Display name"><Input value={p.display_name ?? ""} onChange={(e) => setP({ ...p, display_name: e.target.value })} /></Field>
              <Field label="Date of birth"><Input type="date" value={p.date_of_birth ?? ""} onChange={(e) => setP({ ...p, date_of_birth: e.target.value })} /></Field>
              <Field label="Gender"><Input value={p.gender ?? ""} placeholder="e.g. male / female / other" onChange={(e) => setP({ ...p, gender: e.target.value })} /></Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Physical stats</CardTitle><CardDescription>Used to contextualise biomechanics</CardDescription></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Field label="Height (cm)"><Input type="number" step="0.1" value={p.height_cm ?? ""} onChange={(e) => setP({ ...p, height_cm: e.target.value ? Number(e.target.value) : null })} /></Field>
              <Field label="Weight (kg)"><Input type="number" step="0.1" value={p.weight_kg ?? ""} onChange={(e) => setP({ ...p, weight_kg: e.target.value ? Number(e.target.value) : null })} /></Field>
              <Field label="Dominant side"><Input value={p.dominant_side ?? ""} placeholder="left / right" onChange={(e) => setP({ ...p, dominant_side: e.target.value })} /></Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Sport &amp; training</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Primary sport"><Input value={p.primary_sport ?? ""} placeholder="Sprinting, Cricket, Football…" onChange={(e) => setP({ ...p, primary_sport: e.target.value })} /></Field>
              <Field label="Position / discipline"><Input value={p.position ?? ""} onChange={(e) => setP({ ...p, position: e.target.value })} /></Field>
              <Field label="Experience (years)"><Input type="number" value={p.experience_years ?? ""} onChange={(e) => setP({ ...p, experience_years: e.target.value ? Number(e.target.value) : null })} /></Field>
              <Field label="Training frequency"><Input value={p.training_frequency ?? ""} placeholder="e.g. 5 sessions / week" onChange={(e) => setP({ ...p, training_frequency: e.target.value })} /></Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Background</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Injury history"><Textarea rows={3} value={p.injury_history ?? ""} onChange={(e) => setP({ ...p, injury_history: e.target.value })} /></Field>
              <Field label="Goals"><Textarea rows={3} value={p.goals ?? ""} onChange={(e) => setP({ ...p, goals: e.target.value })} /></Field>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save profile
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
