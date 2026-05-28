import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Camera, ImageIcon, Sparkles, Zap, Check, Loader2, Pencil, AlertCircle } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { analyzeFoodImage, type SearchFood } from "@/lib/api";
import { addMeal } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/scan")({
  head: () => ({ meta: [{ title: "AI Food Scan · CalorieFlow AI" }] }),
  component: Scan,
});

function emojiFor(n: string) {
  const s = n.toLowerCase();
  if (s.includes("chicken")) return "🍗";
  if (s.includes("rice")) return "🍚";
  if (s.includes("broccoli") || s.includes("greens")) return "🥦";
  if (s.includes("egg")) return "🥚";
  if (s.includes("salad")) return "🥗";
  if (s.includes("pizza")) return "🍕";
  if (s.includes("burger")) return "🍔";
  if (s.includes("fish") || s.includes("salmon")) return "🐟";
  if (s.includes("pasta")) return "🍝";
  if (s.includes("apple") || s.includes("fruit")) return "🍎";
  return "🍽️";
}

function Scan() {
  const nav = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<"idle" | "scanning" | "results" | "error" | "no-camera">("idle");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string>("");
  const [items, setItems] = useState<SearchFood[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [editing, setEditing] = useState<number | null>(null);
  const [flashOn, setFlashOn] = useState(false);

  // Start camera on mount
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        setCameraError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (msg.includes("NotFound") || msg.includes("DevicesNotFound")) {
        setCameraError("No camera found on this device.");
      } else {
        setCameraError("Could not start camera. Try using the gallery instead.");
      }
      setPhase("no-camera");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera]);

  // Capture frame from video and send to AI
  const capture = async () => {
    if (phase === "scanning") return;
    setPhase("scanning");

    try {
      let imageDataUrl = "";

      if (videoRef.current && canvasRef.current && cameraReady) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          imageDataUrl = canvas.toDataURL("image/jpeg", 0.85);
        }
      }

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Scan timed out. Check your connection and try again.")), 30_000),
      );
      const r = await Promise.race([analyzeFoodImage(imageDataUrl || undefined), timeout]);

      if (!r.items.length) {
        toast.error("No food detected. Try pointing closer at your plate.");
        setPhase("idle");
        return;
      }

      setItems(r.items);
      setConfidence(r.confidence);
      setPhase("results");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Scan failed. Try again.";
      toast.error(msg, { duration: 5000 });
      setPhase("idle");
    }
  };

  // Pick image from gallery
  const pickFromGallery = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setPhase("scanning");
      try {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            const imageDataUrl = ev.target?.result as string;
            const timeout = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Scan timed out. Check your connection and try again.")), 30_000),
            );
            const r = await Promise.race([analyzeFoodImage(imageDataUrl), timeout]);
            if (!r.items.length) {
              toast.error("No food detected in this photo.");
              setPhase("idle");
              return;
            }
            setItems(r.items);
            setConfidence(r.confidence);
            setPhase("results");
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Scan failed. Try again.";
            toast.error(msg, { duration: 5000 });
            setPhase("idle");
          }
        };
        reader.readAsDataURL(file);
      } catch {
        toast.error("Could not read the image. Try again.");
        setPhase("idle");
      }
    };
    input.click();
  };

  const total = items.reduce(
    (a, i) => ({ k: a.k + i.kcal, p: a.p + i.p, c: a.c + i.c, f: a.f + i.f }),
    { k: 0, p: 0, c: 0, f: 0 },
  );

  const logAll = () => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    items.forEach((i) =>
      addMeal({ name: i.name, type: "Lunch", time, calories: i.kcal, protein: i.p, carbs: i.c, fat: i.f, emoji: emojiFor(i.name) }),
    );
    toast.success("Scan logged", { description: `${items.length} items added` });
    nav({ to: "/diary" });
  };

  const retry = () => {
    setPhase("idle");
    setItems([]);
  };

  return (
    <AppShell>
      <PageHeader title="AI Food Scan" subtitle="Point your camera at your plate" />

      <div className="px-4 pt-4 pb-32">
        {/* Camera viewfinder */}
        <div className="relative aspect-[3/4] rounded-3xl overflow-hidden glass-strong bg-black">
          {/* Real camera feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover ${phase === "results" ? "opacity-30" : "opacity-100"}`}
          />

          {/* Hidden canvas for frame capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Corner brackets */}
          {["top-6 left-6 border-t-2 border-l-2 rounded-tl-2xl", "top-6 right-6 border-t-2 border-r-2 rounded-tr-2xl", "bottom-6 left-6 border-b-2 border-l-2 rounded-bl-2xl", "bottom-6 right-6 border-b-2 border-r-2 rounded-br-2xl"].map((c) => (
            <div key={c} className={`absolute w-12 h-12 border-primary/80 ${c}`} />
          ))}

          {/* Scan line animation */}
          {phase === "scanning" && (
            <div className="absolute inset-x-10 top-1/2 h-px gradient-primary glow animate-pulse" />
          )}

          {/* No camera error */}
          {phase === "no-camera" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertCircle className="w-10 h-10 text-destructive" />
              <p className="text-sm font-semibold text-white">{cameraError}</p>
              <button onClick={pickFromGallery} className="h-10 px-5 rounded-full gradient-primary text-primary-foreground text-xs font-semibold">
                Use Gallery Instead
              </button>
            </div>
          )}

          {/* Status label */}
          {phase !== "no-camera" && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] text-white bg-black/50 backdrop-blur px-3 py-1.5 rounded-full whitespace-nowrap">
              {phase === "scanning" ? "Analyzing your plate…" : phase === "results" ? "Scan complete ✓" : cameraReady ? "Center the plate and tap capture" : "Starting camera…"}
            </div>
          )}
        </div>

        {/* Scanning state */}
        {phase === "scanning" && (
          <div className="mt-5 glass-strong rounded-2xl p-6 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-sm font-semibold">Analyzing your plate</p>
            <p className="text-xs text-muted-foreground">Detecting foods, estimating portions…</p>
          </div>
        )}

        {/* Error state */}
        {phase === "error" && (
          <div className="mt-5 glass-strong rounded-2xl p-6 text-center space-y-3">
            <p className="text-sm font-semibold">Scan failed</p>
            <p className="text-xs text-muted-foreground">Try better lighting or move closer to the plate.</p>
            <button onClick={retry} className="h-10 px-4 rounded-full glass text-xs font-semibold">Try again</button>
          </div>
        )}

        {/* Results */}
        {phase === "results" && (
          <div className="mt-5 glass-strong rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold">AI detected · {Math.round(confidence * 100)}% confidence</p>
            </div>
            <div className="space-y-2">
              {items.map((d, i) => (
                <div key={d.name} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg gradient-primary grid place-items-center text-primary-foreground shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editing === i ? (
                      <input
                        autoFocus
                        defaultValue={d.name}
                        onBlur={(e) => {
                          setItems((arr) => arr.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)));
                          setEditing(null);
                        }}
                        className="w-full bg-transparent text-sm font-medium border-b border-primary/50 focus:outline-none"
                      />
                    ) : (
                      <p className="text-sm font-medium truncate">{d.name}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground">{d.kcal} kcal · P{d.p} C{d.c} F{d.f}</p>
                  </div>
                  <button onClick={() => setEditing(i)} className="text-xs font-medium text-primary inline-flex items-center gap-1 shrink-0">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total estimate</span>
              <span className="font-bold tabular-nums">{total.k} kcal · {total.p}P {total.c}C {total.f}F</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={retry} className="flex-1 h-12 rounded-xl glass text-sm font-semibold">
                Retake
              </button>
              <button onClick={logAll} className="flex-[2] h-12 rounded-xl gradient-primary text-primary-foreground font-semibold glow">
                Log this meal
              </button>
            </div>
          </div>
        )}

        {/* Controls */}
        {phase !== "results" && phase !== "no-camera" && (
          <div className="mt-5 flex items-center justify-around">
            <button
              onClick={pickFromGallery}
              className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span className="w-12 h-12 rounded-full glass grid place-items-center">
                <ImageIcon className="w-5 h-5" />
              </span>
              Gallery
            </button>

            <button
              onClick={capture}
              disabled={phase === "scanning" || !cameraReady}
              aria-label="Capture"
              className="w-20 h-20 rounded-full gradient-primary grid place-items-center ring-4 ring-background disabled:opacity-50"
            >
              {phase === "scanning"
                ? <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
                : <Camera className="w-8 h-8 text-primary-foreground" />}
            </button>

            <button
              onClick={() => setFlashOn((v) => !v)}
              className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span className={`w-12 h-12 rounded-full grid place-items-center ${flashOn ? "gradient-primary" : "glass"}`}>
                <Zap className={`w-5 h-5 ${flashOn ? "text-primary-foreground" : ""}`} />
              </span>
              Flash
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
