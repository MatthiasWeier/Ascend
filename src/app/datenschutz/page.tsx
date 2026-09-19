import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOperatorConfig } from "@/lib/operator-config";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: `${t("Datenschutzerklärung")} — Ascend` };
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
        {t("Zurück")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("Datenschutzerklärung")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Beschreibt, welche Daten die Ascend-Software verarbeitet - unabhängig davon, wer diese konkrete Instanz betreibt.")}
        </p>
        {t("__legal_note__") !== "__legal_note__" && (
          <p className="mt-1 text-xs text-muted-foreground">{t("__legal_note__")}</p>
        )}
      </div>

      <div className="flex flex-col gap-5 text-sm leading-relaxed">
        <Section title={t("1. Verantwortlicher")}>
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
              {t("Der Betreiber dieser Instanz hat noch keine Kontaktdaten hinterlegt (Umgebungsvariablen")}{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">OPERATOR_NAME</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">OPERATOR_ADDRESS</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">OPERATOR_EMAIL</code>).{" "}
              {t("Bis das nachgeholt ist, ist diese Erklärung unvollständig.")}
            </p>
          )}
        </Section>

        <Section title={t("2. Welche Daten wir verarbeiten")}>
          <p>
            <strong>{t("Accountdaten:")}</strong>{" "}
            {t("Benutzername, Passwort (nur als Hash gespeichert, nie im Klartext), Anzeigename.")}
          </p>
          <p>
            <strong>{t("Trainingsdaten:")}</strong>{" "}
            {t("von dir eingetragene Workouts (Übungen, Wiederholungen, Gewicht, Zeit), Körpergewicht-Verlauf, Kletter-/Boulder-Einträge, Anstrengungs- und Haut-Zustand-Angaben.")}
          </p>
          <p>
            <strong>{t("Gruppendaten:")}</strong>{" "}
            {t("Gruppenmitgliedschaften, von dir verfasste Beiträge, von dir hochgeladene Fotos, Challenge-Ziele und -Fortschritte. Diese Daten sind für andere Mitglieder der jeweiligen Gruppe sichtbar - lad nur Fotos hoch, bei denen alle abgebildeten Personen einverstanden sind.")}
          </p>
          <p>
            <strong>{t("Technische Daten:")}</strong>{" "}
            {t("ein Session-Cookie zur Anmeldung (siehe Abschnitt 4) sowie ein Cookie für die gewählte Sprache. Keine Analyse- oder Tracking-Cookies, kein Drittanbieter-Tracking.")}
          </p>
        </Section>

        <Section title={t("3. Zweck und Rechtsgrundlage")}>
          <p>
            {t("Die Verarbeitung erfolgt zur Bereitstellung der Kernfunktionen der App (Trainings-Tracking, Gruppen-Features) und damit zur Erfüllung des Nutzungsvertrags, den du durch die Registrierung eingehst (Art. 6 Abs. 1 lit. b DSGVO).")}
          </p>
        </Section>

        <Section title={t("4. Cookies")}>
          <p>
            {t("Es werden ausschließlich technisch notwendige Cookies gesetzt: ein Session-Cookie")} (
            <code className="rounded bg-muted px-1 py-0.5 text-xs">authjs.session-token</code>,
            HttpOnly, SameSite=Lax) {t("um dich eingeloggt zu halten, und ein Sprach-Cookie")} (
            <code className="rounded bg-muted px-1 py-0.5 text-xs">ascend-locale</code>){" "}
            {t("das nur deine Sprachwahl speichert. Da es sich um unbedingt erforderliche Cookies handelt, ist dafür nach § 25 Abs. 2 TTDSG keine Einwilligung erforderlich - es gibt daher keinen Cookie-Banner.")}
          </p>
        </Section>

        <Section title={t("5. Weitergabe an Dritte")}>
          <p>
            {t("Es findet keine Weitergabe an Dritte statt. Ascend läuft selbstgehostet - alle Daten bleiben auf dem Server des Betreibers, sofern dieser nicht selbst zusätzliche Drittanbieter-Dienste integriert (was diese Instanz standardmäßig nicht tut).")}
          </p>
        </Section>

        <Section title={t("6. Speicherdauer")}>
          <p>
            {t("Deine Daten werden gespeichert, solange dein Account besteht. Du kannst deinen Account samt aller zugehörigen Daten jederzeit selbst in den Einstellungen löschen (\"Danger Zone\") - das ist unwiderruflich und sofort wirksam.")}
          </p>
        </Section>

        <Section title={t("7. Deine Rechte")}>
          <p>
            {t("Du hast nach der DSGVO das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21) bezüglich deiner Daten, sowie das Recht auf Beschwerde bei einer Datenschutz-Aufsichtsbehörde. Wende dich dafür an den unter Punkt 1 genannten Betreiber.")}
          </p>
        </Section>
      </div>
    </main>
  );
}
