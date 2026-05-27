import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Trash2, RotateCcw, CloudCheck, ShieldCheck, Inbox } from "lucide-react";
import { getTrash, purgeTrash, restoreMeal, useStore } from "@/lib/store";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";

export const Route = createFileRoute("/restore")({
  head: () => ({ meta: [{ title: "Restore · CalorieFlow AI" }] }),
  component: Restore,
});

function Restore() {
  const items = useStore(() => getTrash());

  const restore = (id: string) => {
    const it = items.find((i) => i.id === id);
    restoreMeal(id);
    toast.success("Restored", { description: it?.name });
  };
  const purge = (id: string) => {
    purgeTrash(id);
    toast("Permanently removed");
  };

  return (
    <AppShell>
      <PageHeader title="Restore deleted" subtitle="Kept for 30 days" />

      <div className="px-4 pt-3 pb-32 space-y-3">
        <div className="glass-strong rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary grid place-items-center glow">
            <CloudCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Cloud backup is on</p>
            <p className="text-[11px] text-muted-foreground">Synced just now · Local-first storage</p>
          </div>
          <ShieldCheck className="w-4 h-4 text-[var(--success)]" />
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No deleted entries"
            description="Anything you remove from the diary lives here for 30 days before being purged."
          />
        ) : (
          items.map((it) => (
            <div key={it.id} className="glass rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl glass-strong grid place-items-center text-xl">{it.emoji}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{it.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {it.type} · {it.calories} kcal · deleted {new Date(it.deletedAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => restore(it.id)} className="w-9 h-9 grid place-items-center rounded-full gradient-primary text-primary-foreground glow" aria-label="Restore">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={() => purge(it.id)} className="w-9 h-9 grid place-items-center rounded-full glass text-destructive" aria-label="Delete forever">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
