import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { ThemeBootstrap } from "@/components/ThemeToggle";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0a1220" },
      { title: "CalorieFlow AI" },
      { name: "description", content: "Premium AI calorie tracker & gym companion. Snap, speak, or scan to log meals in seconds." },
      { property: "og:title", content: "CalorieFlow AI" },
      { property: "og:description", content: "Premium AI calorie tracker & gym companion. Snap, speak, or scan to log meals in seconds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "CalorieFlow AI" },
      { name: "twitter:description", content: "Premium AI calorie tracker & gym companion. Snap, speak, or scan to log meals in seconds." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3e6d8878-6bb2-4d8d-a5ca-d9a93868af1e/id-preview-8ff99e8b--df5bd9cf-8ebe-4023-b40e-d05f5fb1d16a.lovable.app-1779863512809.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3e6d8878-6bb2-4d8d-a5ca-d9a93868af1e/id-preview-8ff99e8b--df5bd9cf-8ebe-4023-b40e-d05f5fb1d16a.lovable.app-1779863512809.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
      { rel: "icon", type: "image/png", href: "/icon-512.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeBootstrap />
      <AnimatedBackground />
      <SyncBootstrap />
      <Outlet />
      <SonnerToaster />
    </QueryClientProvider>
  );
}


function SyncBootstrap() {
  const router = useRouter();
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    Promise.all([
      import("@/lib/sync"),
      import("@/lib/store"),
      import("@/lib/health"),
      import("@/integrations/supabase/client"),
    ]).then(([sync, store, health, sb]) => {
      if (cancelled) return;
      sync.startSync({
        meals: store.hydrateMeals,
        goals: store.hydrateGoals,
        profile: store.hydrateProfile,
        favorites: store.hydrateFavorites,
        templates: store.hydrateTemplates,
        trash: store.hydrateTrash,
        subscription: store.hydrateSubscription,
        health: health.hydrateHealth,
      });
      const { data } = sb.supabase.auth.onAuthStateChange(() => router.invalidate());
      unsub = () => data.subscription.unsubscribe();
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [router]);
  return null;
}
