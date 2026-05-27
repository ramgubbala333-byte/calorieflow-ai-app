import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · CalorieFlow AI" },
      { name: "description", content: "How CalorieFlow AI collects, uses and protects your data." },
    ],
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <AppShell>
      <PageHeader title="Privacy Policy" subtitle="Last updated May 2026" />
      <div className="px-5 pt-2 pb-10 space-y-5">
        <div className="glass-strong rounded-2xl p-4 flex gap-3">
          <ShieldCheck className="w-5 h-5 text-[var(--success)] shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            We don't sell your data, we don't run ads, and we minimize what we collect.
          </p>
        </div>

        <Section title="What we collect">
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Account</b>: email, display name.</li>
            <li><b>Body metrics</b>: height, weight, age, goals — only what you enter.</li>
            <li><b>Food logs</b>: meals you log manually, by scan, voice, or barcode.</li>
            <li><b>Diagnostics</b>: anonymous crash reports if you opt in.</li>
          </ul>
        </Section>

        <Section title="What we don't collect">
          <ul className="list-disc pl-5 space-y-1">
            <li>Photos stay on your device unless you tap "Scan".</li>
            <li>No background microphone or camera access.</li>
            <li>No advertising identifiers. No data brokers.</li>
          </ul>
        </Section>

        <Section title="AI processing">
          Photo, voice and text are processed only when you trigger a scan. You can disable
          AI training contributions or turn AI off entirely under Settings → Privacy.
        </Section>

        <Section title="Your rights (GDPR / CCPA)">
          Export your data, correct it, or delete your account at any time under
          Settings → Data. We honor requests within 30 days.
        </Section>

        <Section title="Contact">
          Privacy questions: <span className="text-primary">privacy@calorieflow.app</span>.
        </Section>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 text-sm leading-relaxed text-muted-foreground">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
