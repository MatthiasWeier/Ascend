import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOperatorConfig } from "@/lib/operator-config";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: `${t("Privacy policy")} — Ascend` };
}
// See impressum/page.tsx for why this must stay dynamic (env read at
// request time, not baked in at `docker build` time).
export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="font-semibold">{title}</h2>
      <div className="flex flex-col gap-2 text-muted-foreground">{children}</div>
    </section>
  );
}

export default async function DatenschutzPage() {
  const operator = getOperatorConfig();
  const { t } = await getT();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <Link href="/" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {t("Back")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("Privacy policy")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Describes which data the Ascend software processes - regardless of who operates this particular instance.")}
        </p>
        {t("English courtesy translation - the German version is legally binding.") !== "English courtesy translation - the German version is legally binding." && (
          <p className="mt-1 text-xs text-muted-foreground">{t("English courtesy translation - the German version is legally binding.")}</p>
        )}
      </div>

      <div className="flex flex-col gap-5 text-sm leading-relaxed">
        <Section title={t("1. Controller")}>
          {operator.isConfigured ? (
            <p className="whitespace-pre-line">
              {operator.name}
              {"\n"}
              {operator.address}
              {"\n"}
              {operator.email}
            </p>
          ) : (
            <p className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 p-3 text-destructive">
              {t("The operator of this instance hasn't provided contact details yet (environment variables")}{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">OPERATOR_NAME</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">OPERATOR_ADDRESS</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">OPERATOR_EMAIL</code>).{" "}
              {t("Until that's done, this policy is incomplete.")}
            </p>
          )}
        </Section>

        <Section title={t("2. Which data we process")}>
          <p>
            <strong>{t("Account data:")}</strong>{" "}
            {t("username, password (stored only as a hash, never in plain text), display name.")}
          </p>
          <p>
            <strong>{t("Training data:")}</strong>{" "}
            {t("workouts you log (exercises, reps, weight, time), body weight history, climbing/boulder entries, effort and skin condition ratings.")}
          </p>
          <p>
            <strong>{t("Group data:")}</strong>{" "}
            {t("group memberships, posts you write, photos you upload, challenge goals and progress. This data is visible to the other members of the respective group - only upload photos where everyone pictured agrees.")}
          </p>
          <p>
            <strong>{t("Technical data:")}</strong>{" "}
            {t("a session cookie for login (see section 4) and a cookie for the selected language. No analytics or tracking cookies, no third-party tracking.")}
          </p>
        </Section>

        <Section title={t("3. Purpose and legal basis")}>
          <p>
            {t("Processing takes place to provide the app's core functions (training tracking, group features) and thus to fulfil the usage contract you enter into by registering (Art. 6(1)(b) GDPR).")}
          </p>
        </Section>

        <Section title={t("4. Cookies")}>
          <p>
            {t("Only technically necessary cookies are set: a session cookie")} (
            <code className="rounded bg-muted px-1 py-0.5 text-xs">authjs.session-token</code>,
            HttpOnly, SameSite=Lax) {t("to keep you logged in, and a language cookie")} (
            <code className="rounded bg-muted px-1 py-0.5 text-xs">ascend-locale</code>){" "}
            {t("that only stores your language choice. Since these are strictly necessary cookies, no consent is required under § 25(2) TTDSG - so there is no cookie banner.")}
          </p>
        </Section>

        <Section title={t("5. Disclosure to third parties")}>
          <p>
            {t("No data is passed on to third parties. Ascend is self-hosted - all data stays on the operator's server, unless the operator integrates additional third-party services themselves (which this instance doesn't do by default).")}
          </p>
        </Section>

        <Section title={t("6. Retention")}>
          <p>
            {t("Your data is stored as long as your account exists. You can delete your account including all related data yourself at any time in Settings (\"Danger zone\") - this is irreversible and takes effect immediately.")}
          </p>
        </Section>

        <Section title={t("7. Your rights")}>
          <p>
            {t("Under the GDPR you have the right of access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18), data portability (Art. 20) and objection (Art. 21) regarding your data, as well as the right to lodge a complaint with a data protection supervisory authority. Contact the operator named in section 1 for this.")}
          </p>
        </Section>
      </div>
    </main>
  );
}
