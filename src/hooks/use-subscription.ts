/**
 * Subscription state hook.
 *
 * Reads `subscriptions` row for the current user. UI uses `isPremium` to gate
 * unlimited AI scans, voice logs, advanced coach, and advanced insights.
 *
 * Payment activation is handled by Lovable Payments (Paddle, recommended for
 * this project). Hitting "Upgrade" should open the in-app Lovable Payments
 * checkout; on successful payment, a webhook updates the `subscriptions` row
 * and this hook reflects the change on next refresh.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Subscription = {
  tier: "free" | "monthly" | "yearly";
  status: "active" | "trialing" | "canceled" | "past_due";
  current_period_end: string | null;
};

const FREE: Subscription = { tier: "free", status: "active", current_period_end: null };

export function useSubscription() {
  const [sub, setSub] = useState<Subscription>(FREE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        if (active) {
          setSub(FREE);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("subscriptions")
        .select("tier,status,current_period_end")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (active) {
        setSub((data as Subscription | null) ?? FREE);
        setLoading(false);
      }
    };
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(load);
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const isPremium = sub.tier !== "free" && (sub.status === "active" || sub.status === "trialing");

  return { sub, loading, isPremium };
}
