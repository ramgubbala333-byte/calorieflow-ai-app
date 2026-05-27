import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service · CalorieFlow AI" },
      { name: "description", content: "Terms of Service for CalorieFlow AI." },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <AppShell>
      <PageHeader title="Terms of Service" subtitle="Last updated May 2026" />
      <article className="px-5 pt-2 pb-10 space-y-5 text-sm leading-relaxed text-muted-foreground">
        <Section title="1. Acceptance">
          By creating an account or using CalorieFlow AI you agree to these terms. If you do not
          agree, please don't use the service.
        </Section>
        <Section title="2. The service">
          CalorieFlow AI is a calorie and fitness tracking tool. It does not provide medical
          advice. Always consult a qualified professional before changing your diet or training.
        </Section>
        <Section title="3. Your account">
          You're responsible for keeping your credentials safe. Notify us immediately of any
          unauthorized use.
        </Section>
        <Section title="4. Subscriptions">
          Pro subscriptions auto-renew until cancelled. You can cancel anytime from Settings →
          Subscription. Refunds follow your platform's standard policy.
        </Section>
        <Section title="5. Acceptable use">
          Don't reverse-engineer, scrape, or use the service to harass anyone. We may suspend
          accounts that violate these rules.
        </Section>
        <Section title="6. Liability">
          The service is provided "as is" without warranties. To the maximum extent permitted by
          law, our liability is limited to the amount you paid in the last 12 months.
        </Section>
        <Section title="7. Contact">
          Questions? Email <span className="text-primary">support@calorieflow.app</span>.
        </Section>
      </article>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p>{children}</p>
    </section>
  );
}
