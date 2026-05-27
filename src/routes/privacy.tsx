import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Brain, ShieldCheck, Trash2, Download, Database, Hand, ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deleteAllData, downloadExport } from "@/lib/store";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy · CalorieFlow AI" }] }),
  component: Privacy,
});

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`w-11 h-6 rounded-full p-0.5 transition-colors ${on ? "gradient-primary" : "bg-white/10"}`}
      aria-pressed={on}
    >
      <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}

function Privacy() {
  const nav = useNavigate();
  const [tapOnly, setTapOnly] = useState(true);
  const [noTraining, setNoTraining] = useState(true);
  const [manualOnly, setManualOnly] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const doExport = async () => {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 400));
    try {
      downloadExport();
      toast.success("Export ready", { description: "JSON archive downloaded" });
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    await new Promise((r) => setTimeout(r, 500));
    deleteAllData();
    setDeleting(false);
    setConfirmDelete(false);
    toast.success("Account & local data deleted");
    nav({ to: "/" });
  };

  return (
    <AppShell>
      <PageHeader title="Privacy" subtitle="You own your data" />

      <div className="px-4 pt-4 pb-32 space-y-4">
        <div className="glass-strong rounded-2xl p-4 flex gap-3">
          <ShieldCheck className="w-5 h-5 text-[var(--success)] shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            CalorieFlow AI processes images on-device when possible. We never sell your data and never show ads.
          </p>
        </div>

        <Section title="What we collect">
          <div className="p-4 text-xs text-muted-foreground space-y-2">
            <p><b className="text-foreground">Account:</b> email, display name.</p>
            <p><b className="text-foreground">Body metrics:</b> height, weight, age — only what you enter.</p>
            <p><b className="text-foreground">Food logs:</b> meals you log manually, by scan, voice or barcode.</p>
            <p><b className="text-foreground">Never:</b> background camera/mic, ad IDs, or sales to third parties.</p>
          </div>
        </Section>

        <Section title="AI controls">
          <RowToggle icon={Brain} label="AI scan only when I tap" desc="No background camera or analysis" on={tapOnly} onChange={setTapOnly} />
          <RowToggle icon={Database} label="Don't use my data for training" desc="Opt out of model improvement" on={noTraining} onChange={setNoTraining} />
          <RowToggle icon={Hand} label="Manual-only mode" desc="Disable all AI features" on={manualOnly} onChange={setManualOnly} />
          <Action icon={Trash2} label="Delete AI history" onClick={() => toast.success("AI history cleared")} />
        </Section>

        <Section title="Your data">
          <Action
            icon={exporting ? Loader2 : Download}
            label={exporting ? "Preparing export…" : "Export my data"}
            desc="Download a JSON archive of your diary, templates and goals"
            onClick={doExport}
            spinning={exporting}
          />
          <Action
            icon={Trash2}
            label="Delete account and all data"
            danger
            onClick={() => setConfirmDelete(true)}
          />
        </Section>

        <div className="text-center text-[11px] text-muted-foreground px-6 leading-relaxed pb-2 space-x-2">
          <span>GDPR & CCPA compliant.</span>
          <button onClick={() => nav({ to: "/privacy-policy" })} className="text-primary">Privacy Policy</button>
          <span>·</span>
          <button onClick={() => nav({ to: "/terms" })} className="text-primary">Terms</button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
          <button aria-label="Close" onClick={() => setConfirmDelete(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm mx-auto glass-strong rounded-3xl p-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] animate-fade-up">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-destructive/20 grid place-items-center mb-3">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="text-base font-semibold text-center">Delete everything?</h3>
            <p className="text-xs text-muted-foreground text-center mt-2">
              This permanently removes your account, diary, templates, photos and AI history. This cannot be undone.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={doDelete}
                disabled={deleting}
                className="h-12 rounded-xl bg-destructive text-destructive-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Yes, delete everything
              </button>
              <button onClick={() => setConfirmDelete(false)} className="h-12 rounded-xl glass text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-1 mb-2">{title}</p>
      <div className="glass-strong rounded-2xl divide-y divide-border overflow-hidden">{children}</div>
    </div>
  );
}

function RowToggle({ icon: Icon, label, desc, on, onChange }: { icon: typeof Brain; label: string; desc?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="p-4 flex items-center gap-3">
      <Icon className="w-4 h-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm">{label}</p>
        {desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

function Action({ icon: Icon, label, desc, onClick, danger = false, spinning = false }: { icon: typeof Trash2; label: string; desc?: string; onClick: () => void; danger?: boolean; spinning?: boolean }) {
  return (
    <button onClick={onClick} className="w-full p-4 flex items-center gap-3 text-left">
      <Icon className={`w-4 h-4 ${danger ? "text-destructive" : "text-primary"} ${spinning ? "animate-spin" : ""}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${danger ? "text-destructive font-medium" : ""}`}>{label}</p>
        {desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}
      </div>
      <ChevronRight className={`w-4 h-4 ${danger ? "text-destructive" : "text-muted-foreground"}`} />
    </button>
  );
}
