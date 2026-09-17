import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOperatorConfig } from "@/lib/operator-config";

export const metadata = { title: "Impressum — Ascend" };
// Operator config is read from process.env at request time, not build
// time - the same Docker image is meant to be deployed by many different
// operators with different env vars, so this must never be statically
// prerendered (which would bake in whatever was set during `docker build`).
export const dynamic = "force-dynamic";

export default function ImpressumPage() {
  const operator = getOperatorConfig();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <Link href="/" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Zurück
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">Impressum</h1>

      {!operator.isConfigured ? (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-5 text-sm">
          <p className="font-medium text-destructive">
            Dieser Betreiber hat noch kein Impressum hinterlegt.
          </p>
          <p className="text-muted-foreground">
            Ascend ist Open-Source-Software und kann von jedem selbst gehostet werden. Wer diese
            Instanz betreibt, muss die
            Umgebungsvariablen <code className="rounded bg-muted px-1 py-0.5 text-xs">OPERATOR_NAME</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">OPERATOR_ADDRESS</code> und{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">OPERATOR_EMAIL</code> setzen, bevor die
            Anwendung mit echten Nutzer:innen produktiv geht (in Deutschland i.d.R. Pflicht nach § 5 DDG,
            sobald das Angebot nicht rein privat/nicht-kommerziell ist).
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 text-sm leading-relaxed">
          <section>
            <h2 className="mb-1 font-semibold">Angaben gemäß § 5 DDG</h2>
            <p className="whitespace-pre-line text-muted-foreground">
              {operator.name}
              {"\n"}
              {operator.address}
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold">Kontakt</h2>
            <p className="text-muted-foreground">
              E-Mail: {operator.email}
              {operator.phone && (
                <>
                  <br />
                  Telefon: {operator.phone}
                </>
              )}
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
            <p className="text-muted-foreground">{operator.name}</p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold">Haftungshinweis</h2>
            <p className="text-muted-foreground">
              Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte
              externer Links. Für den Inhalt verlinkter Seiten sind ausschließlich deren Betreiber
              verantwortlich.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold">Software</h2>
            <p className="text-muted-foreground">
              Diese Instanz läuft auf Ascend, einer Open-Source-Anwendung (MIT-Lizenz). Der Quellcode ist
              unverändert oder verändert selbst hostbar; diese Seite beschreibt ausschließlich den
              Betreiber dieser konkreten Instanz, nicht das Softwareprojekt selbst.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
