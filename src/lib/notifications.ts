/**
 * Web push notifications.
 *
 * - On web/PWA: uses the browser Notification API + setTimeout. Service-
 *   worker-backed push and background scheduling require a registered SW
 *   and is intentionally out of scope here to avoid breaking the editor
 *   preview (see PWA constraints in knowledge).
 * - For native iOS/Android (Capacitor wrap), swap these functions with
 *   `@capacitor/local-notifications` and `@capacitor/push-notifications`.
 *   The function names are kept stable so call sites won't change.
 */
export type NotificationKind = "workout_reminder" | "missed_workout" | "meal_log_nudge";

export function isSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function permission(): NotificationPermission | "unsupported" {
  if (!isSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isSupported()) return "unsupported";
  if (Notification.permission === "default") {
    return Notification.requestPermission();
  }
  return Notification.permission;
}

export function notify(title: string, options?: NotificationOptions & { kind?: NotificationKind }) {
  if (!isSupported() || Notification.permission !== "granted") return;
  try {
    new Notification(title, { icon: "/icon-192.png", badge: "/icon-192.png", ...options });
  } catch (e) {
    console.error("[notify]", e);
  }
}

const scheduled = new Map<string, ReturnType<typeof setTimeout>>();

export function schedule(id: string, atMs: number, title: string, body?: string, kind?: NotificationKind) {
  cancel(id);
  const delay = atMs - Date.now();
  if (delay <= 0) {
    notify(title, { body, kind });
    return;
  }
  scheduled.set(
    id,
    setTimeout(() => {
      notify(title, { body, kind });
      scheduled.delete(id);
    }, delay),
  );
}

export function cancel(id: string) {
  const t = scheduled.get(id);
  if (t) {
    clearTimeout(t);
    scheduled.delete(id);
  }
}
