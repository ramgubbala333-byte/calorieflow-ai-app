import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import type { Meal } from "@/lib/mock-data";
import {
  deleteMeal as storeDelete,
  getMeals,
  restoreMeal,
  saveTemplate as storeSaveTemplate,
  setMeals as storeSetMeals,
  addMeal as storeAddMeal,
  getGoals,
  useStore,
} from "@/lib/store";
import { EmptyState } from "@/components/EmptyState";
import {
  Calendar, Copy, CopyCheck, Bookmark, Plus, ChevronLeft, ChevronRight,
  GripVertical, Pencil, Trash2, MoreVertical, Clock, ArrowRightLeft, X, Check, CloudOff, CheckCircle2,
  Utensils,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/diary")({
  head: () => ({ meta: [{ title: "Diary · CalorieFlow AI" }] }),
  component: Diary,
});

type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";
const groups: Array<[MealType, string]> = [
  ["Breakfast", "🌅"],
  ["Lunch", "☀️"],
  ["Snack", "🍎"],
  ["Dinner", "🌙"],
];

function Diary() {
  const meals = useStore(() => getMeals());
  const goals = useStore(() => getGoals());
  const [savedAt, setSavedAt] = useState<Date>(new Date());
  const [online, setOnline] = useState(true);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<Meal | null>(null);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  // Mark saved on any change
  useEffect(() => {
    const t = setTimeout(() => setSavedAt(new Date()), 300);
    return () => clearTimeout(t);
  }, [meals]);

  const totals = useMemo(
    () => meals.reduce(
      (a, m) => ({
        calories: a.calories + m.calories,
        protein: a.protein + m.protein,
        carbs: a.carbs + m.carbs,
        fat: a.fat + m.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    ),
    [meals],
  );

  const deleteMeal = (id: string) => {
    const removed = storeDelete(id);
    if (!removed) return;
    toast("Entry deleted", {
      description: removed.name,
      action: { label: "Undo", onClick: () => restoreMeal(id) },
    });
  };

  const duplicate = (m: Meal) => {
    const { id: _omit, ...rest } = m;
    storeAddMeal(rest);
    toast.success("Duplicated", { description: m.name });
  };

  const moveTo = (m: Meal, type: MealType) => {
    storeSetMeals(getMeals().map((x) => (x.id === m.id ? { ...x, type } : x)));
    toast.success(`Moved to ${type}`);
  };

  const copyToTomorrow = (m: Meal) => {
    const { id: _omit, ...rest } = m;
    storeAddMeal(rest);
    toast.success("Copied to tomorrow", { description: m.name });
  };

  const saveTemplate = (m: Meal) => {
    storeSaveTemplate(m.name, [m]);
    toast.success("Saved as template", { description: m.name });
  };

  const reorder = (type: MealType, fromIdx: number, toIdx: number) => {
    const inType = meals.filter((m) => m.type === type);
    const others = meals.filter((m) => m.type !== type);
    const [moved] = inType.splice(fromIdx, 1);
    inType.splice(toIdx, 0, moved);
    storeSetMeals([...others, ...inType]);
  };

  const bulkShift = (mins: number) => {
    storeSetMeals(
      getMeals().map((m) => {
        if (!selected.has(m.id)) return m;
        const [h, mm] = m.time.split(":").map(Number);
        const total = h * 60 + mm + mins;
        const nh = Math.max(0, Math.min(23, Math.floor(total / 60)));
        const nm = ((total % 60) + 60) % 60;
        return { ...m, time: `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}` };
      }),
    );
    toast.success(`Shifted ${selected.size} item${selected.size === 1 ? "" : "s"} by ${mins > 0 ? "+" : ""}${mins}m`);
  };

  const copyYesterday = () => {
    // Seed-style example: re-add 2 staple meals if today is empty.
    const yesterdays: Omit<Meal, "id">[] = [
      { name: "Masala Poha", type: "Breakfast", time: "07:42", calories: 380, protein: 9, carbs: 62, fat: 11, emoji: "🍛" },
      { name: "Paneer Tikka Salad", type: "Lunch", time: "12:35", calories: 520, protein: 32, carbs: 28, fat: 28, emoji: "🥗" },

    ];
    yesterdays.forEach((m) => storeAddMeal(m));
    toast.success("Copied yesterday's meals", { description: `${yesterdays.length} entries added` });
  };

  const copyWholeDay = () => {
    storeSaveTemplate(`Day · ${new Date().toLocaleDateString()}`, meals);
    toast.success("Day copied", { description: "Saved as template for any date" });
  };

  const saveDayTemplate = () => {
    if (meals.length === 0) return toast("Nothing to save yet");
    storeSaveTemplate(`Template · ${new Date().toLocaleDateString()}`, meals);
    toast.success("Saved today as a template");
  };

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  return (
    <AppShell>
      <PageHeader
        back={false}
        title="Food Diary"
        subtitle="Sunday, May 24"
        right={
          <button aria-label="Date" className="w-10 h-10 rounded-full glass grid place-items-center">
            <Calendar className="w-4 h-4" />
          </button>
        }
      />

      {/* status row */}
      <div className="px-4 pt-2 flex items-center gap-2 text-[11px]">
        {online ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 className="w-3 h-3 text-[var(--success)]" />
            Saved {timeAgo(savedAt)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full glass text-[var(--warning)]">
            <CloudOff className="w-3 h-3" /> Offline — changes saved locally
          </span>
        )}
        <span className="text-muted-foreground/60">·</span>
        <Link to="/restore" className="text-primary font-medium">Restore deleted</Link>
        <button
          onClick={() => { setBulkMode((b) => !b); setSelected(new Set()); }}
          className="ml-auto text-primary font-medium"
        >
          {bulkMode ? "Done" : "Bulk edit"}
        </button>
      </div>

      {/* date strip */}
      <div className="px-4 pt-3 flex items-center gap-2">
        <button className="w-9 h-9 rounded-full glass grid place-items-center"><ChevronLeft className="w-4 h-4" /></button>
        <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar py-1">
          {["Mon 18", "Tue 19", "Wed 20", "Thu 21", "Fri 22", "Sat 23", "Sun 24"].map((d, i) => {
            const active = i === 6;
            return (
              <button
                key={d}
                className={`px-3 h-9 rounded-full text-xs font-medium whitespace-nowrap ${
                  active ? "gradient-primary text-primary-foreground glow" : "glass text-muted-foreground"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
        <button className="w-9 h-9 rounded-full glass grid place-items-center"><ChevronRight className="w-4 h-4" /></button>
      </div>

      {/* summary bar */}
      <div className="px-4 mt-4">
        <div className="glass-strong rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">Total today</p>
            <p className="text-2xl font-bold gradient-text font-display tabular-nums">
              {totals.calories.toLocaleString()}
              <span className="text-sm text-muted-foreground font-normal"> / {goals.calories}</span>
            </p>
          </div>
          <div className="text-right text-[11px] text-muted-foreground space-y-0.5">
            <div>P <b className="text-foreground tabular-nums">{totals.protein}</b>g</div>
            <div>C <b className="text-foreground tabular-nums">{totals.carbs}</b>g</div>
            <div>F <b className="text-foreground tabular-nums">{totals.fat}</b>g</div>
          </div>
        </div>
      </div>

      {/* quick row */}
      <div className="px-4 mt-4 flex gap-2 overflow-x-auto no-scrollbar">
        {[
          { i: Copy, l: "Copy yesterday", a: copyYesterday },
          { i: CopyCheck, l: "Copy whole day", a: copyWholeDay },
          { i: Bookmark, l: "Save day as template", a: saveDayTemplate },
        ].map(({ i: I, l, a }) => (
          <button
            key={l}
            onClick={a}
            className="shrink-0 glass rounded-full pl-3 pr-4 h-9 inline-flex items-center gap-2 text-xs font-medium"
          >
            <I className="w-3.5 h-3.5 text-primary" /> {l}
          </button>
        ))}
      </div>

      {/* bulk bar */}
      {bulkMode && (
        <div className="px-4 mt-3 animate-fade-up">
          <div className="glass-strong rounded-2xl p-3 flex items-center gap-2 text-xs">
            <span className="font-medium">{selected.size} selected</span>
            <div className="ml-auto flex items-center gap-1.5">
              <button onClick={() => bulkShift(-15)} className="px-2.5 h-8 rounded-full glass">−15m</button>
              <button onClick={() => bulkShift(15)} className="px-2.5 h-8 rounded-full glass">+15m</button>
              <button onClick={() => bulkShift(60)} className="px-2.5 h-8 rounded-full glass">+1h</button>
            </div>
          </div>
        </div>
      )}

      {/* meal groups */}
      <div className="px-4 mt-5 space-y-6 pb-32">
        {meals.length === 0 && (
          <EmptyState
            icon={Utensils}
            title="No meals logged yet"
            description="Snap a photo, scan a barcode, or type it in — logging takes 5 seconds."
            ctaLabel="Add your first meal"
            ctaTo="/add-food"
          />
        )}
        {meals.length > 0 && groups.map(([type, emoji]) => {
          const inGroup = meals.filter((m) => m.type === type);
          const sum = inGroup.reduce((a, m) => a + m.calories, 0);
          return (
            <section key={type}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <span>{emoji}</span> {type}
                  <span className="text-xs text-muted-foreground font-normal tabular-nums">· {sum} kcal</span>
                </h2>
                <Link to="/add-food" className="text-xs font-semibold text-primary inline-flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add
                </Link>
              </div>

              {inGroup.length === 0 ? (
                <Link
                  to="/add-food"
                  className="block glass rounded-2xl border-dashed border-2 border-border/60 p-4 text-center text-xs text-muted-foreground"
                >
                  Tap to log {type.toLowerCase()}
                </Link>
              ) : (
                <DiaryList
                  items={inGroup}
                  bulkMode={bulkMode}
                  selected={selected}
                  onToggleSelect={toggleSelect}
                  onReorder={(from, to) => reorder(type, from, to)}
                  onDelete={deleteMeal}
                  onEdit={(m) => toast(`Editing ${m.name}`)}
                  onLongPress={(m) => setMenuFor(m)}
                />
              )}
            </section>
          );
        })}
      </div>

      {/* long-press action sheet */}
      {menuFor && (
        <ActionSheet
          meal={menuFor}
          onClose={() => setMenuFor(null)}
          onDuplicate={() => { duplicate(menuFor); setMenuFor(null); }}
          onMove={(t) => { moveTo(menuFor, t); setMenuFor(null); }}
          onCopyTomorrow={() => { copyToTomorrow(menuFor); setMenuFor(null); }}
          onTemplate={() => { saveTemplate(menuFor); setMenuFor(null); }}
          onDelete={() => { deleteMeal(menuFor.id); setMenuFor(null); }}
        />
      )}
    </AppShell>
  );
}

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function DiaryList({
  items, bulkMode, selected, onToggleSelect, onReorder, onDelete, onEdit, onLongPress,
}: {
  items: Meal[];
  bulkMode: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onDelete: (id: string) => void;
  onEdit: (m: Meal) => void;
  onLongPress: (m: Meal) => void;
}) {
  const dragIdx = useRef<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  return (
    <div className="space-y-2.5">
      {items.map((m, i) => (
        <DiaryRow
          key={m.id}
          meal={m}
          bulkMode={bulkMode}
          checked={selected.has(m.id)}
          onCheck={() => onToggleSelect(m.id)}
          onDelete={() => onDelete(m.id)}
          onEdit={() => onEdit(m)}
          onLongPress={() => onLongPress(m)}
          isDragOver={overIdx === i}
          dragHandlers={{
            onDragStart: () => (dragIdx.current = i),
            onDragOver: (e) => { e.preventDefault(); setOverIdx(i); },
            onDragLeave: () => setOverIdx(null),
            onDrop: () => {
              if (dragIdx.current != null && dragIdx.current !== i) onReorder(dragIdx.current, i);
              dragIdx.current = null;
              setOverIdx(null);
            },
            onDragEnd: () => { dragIdx.current = null; setOverIdx(null); },
          }}
        />
      ))}
    </div>
  );
}

function DiaryRow({
  meal, bulkMode, checked, onCheck, onDelete, onEdit, onLongPress, isDragOver, dragHandlers,
}: {
  meal: Meal;
  bulkMode: boolean;
  checked: boolean;
  onCheck: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onLongPress: () => void;
  isDragOver: boolean;
  dragHandlers: {
    onDragStart: React.DragEventHandler;
    onDragOver: React.DragEventHandler;
    onDragLeave: React.DragEventHandler;
    onDrop: React.DragEventHandler;
    onDragEnd: React.DragEventHandler;
  };
}) {
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const lock = useRef<"h" | "v" | null>(null);
  const pressTimer = useRef<number | null>(null);

  const start = (x: number, y: number) => {
    startX.current = x; startY.current = y; lock.current = null;
    pressTimer.current = window.setTimeout(() => {
      onLongPress();
      startX.current = null;
    }, 500);
  };
  const move = (x: number, y: number) => {
    if (startX.current == null || startY.current == null) return;
    const ddx = x - startX.current;
    const ddy = y - startY.current;
    if (!lock.current && Math.abs(ddx) + Math.abs(ddy) > 6) {
      lock.current = Math.abs(ddx) > Math.abs(ddy) ? "h" : "v";
      if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
    }
    if (lock.current === "h") setDx(Math.max(-120, Math.min(0, ddx)));
  };
  const end = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
    setDx(dx < -60 ? -110 : 0);
    startX.current = null; startY.current = null; lock.current = null;
  };

  return (
    <div
      draggable={!bulkMode}
      {...dragHandlers}
      className={`relative overflow-hidden rounded-2xl ${isDragOver ? "ring-glow" : ""}`}
    >
      {/* swipe actions */}
      <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-3">
        <button onClick={onEdit} className="w-12 h-12 rounded-xl glass grid place-items-center text-primary" aria-label="Edit">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="w-12 h-12 rounded-xl bg-destructive/90 grid place-items-center text-destructive-foreground" aria-label="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div
        className="glass rounded-2xl p-4 flex items-center gap-3 select-none"
        style={{
          transform: `translateX(${dx}px)`,
          transition: startX.current == null ? "transform 250ms ease" : "none",
        }}
        onTouchStart={(e) => start(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => move(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={end}
        onMouseDown={(e) => start(e.clientX, e.clientY)}
        onMouseMove={(e) => e.buttons === 1 && move(e.clientX, e.clientY)}
        onMouseUp={end}
        onMouseLeave={end}
      >
        {bulkMode ? (
          <button
            onClick={(e) => { e.stopPropagation(); onCheck(); }}
            className={`w-6 h-6 shrink-0 rounded-md grid place-items-center border ${checked ? "gradient-primary text-primary-foreground border-transparent" : "border-border bg-transparent"}`}
            aria-label="Select"
          >
            {checked && <Check className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-5 -ml-1 text-muted-foreground/60 cursor-grab touch-none" aria-hidden>
            <GripVertical className="w-4 h-4" />
          </span>
        )}
        <div className="w-11 h-11 rounded-xl glass-strong grid place-items-center text-xl shrink-0">
          {meal.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-semibold text-sm truncate">{meal.name}</h3>
            <span className="text-[11px] text-muted-foreground tabular-nums">{meal.time}</span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span><b className="text-foreground tabular-nums">{meal.calories}</b> kcal</span>
            <span className="text-primary tabular-nums">P {meal.protein}g</span>
            <span className="text-accent tabular-nums">C {meal.carbs}g</span>
            <span className="text-[var(--warning)] tabular-nums">F {meal.fat}g</span>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onLongPress(); }}
          aria-label="More"
          className="w-8 h-8 grid place-items-center rounded-full text-muted-foreground"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ActionSheet({
  meal, onClose, onDuplicate, onMove, onCopyTomorrow, onTemplate, onDelete,
}: {
  meal: Meal;
  onClose: () => void;
  onDuplicate: () => void;
  onMove: (t: MealType) => void;
  onCopyTomorrow: () => void;
  onTemplate: () => void;
  onDelete: () => void;
}) {
  const [moveOpen, setMoveOpen] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-up" />
      <div className="relative w-full max-w-md mx-auto glass-strong rounded-t-3xl p-4 pb-[max(env(safe-area-inset-bottom),1rem)] animate-fade-up">
        <div className="mx-auto w-10 h-1 rounded-full bg-white/15 mb-3" />
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl glass grid place-items-center text-xl">{meal.emoji}</div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{meal.name}</p>
            <p className="text-[11px] text-muted-foreground">{meal.type} · {meal.time}</p>
          </div>
          <button onClick={onClose} className="ml-auto w-8 h-8 grid place-items-center rounded-full glass"><X className="w-4 h-4" /></button>
        </div>

        {!moveOpen ? (
          <div className="space-y-1">
            <SheetItem icon={Copy} label="Duplicate" onClick={onDuplicate} />
            <SheetItem icon={ArrowRightLeft} label="Move to another meal" onClick={() => setMoveOpen(true)} />
            <SheetItem icon={Clock} label="Copy to tomorrow" onClick={onCopyTomorrow} />
            <SheetItem icon={Bookmark} label="Save as meal template" onClick={onTemplate} />
            <SheetItem icon={Trash2} label="Delete entry" danger onClick={onDelete} />
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground px-2 mb-1">Move to</p>
            {(["Breakfast", "Lunch", "Snack", "Dinner"] as MealType[]).map((t) => (
              <SheetItem key={t} icon={ArrowRightLeft} label={t} onClick={() => onMove(t)} />
            ))}
            <button onClick={() => setMoveOpen(false)} className="w-full mt-2 h-10 rounded-xl glass text-xs">Back</button>
          </div>
        )}
      </div>
    </div>
  );
}

function SheetItem({
  icon: Icon, label, onClick, danger = false,
}: { icon: typeof Copy; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full h-12 rounded-xl glass flex items-center gap-3 px-3 text-sm ${danger ? "text-destructive" : ""}`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}
