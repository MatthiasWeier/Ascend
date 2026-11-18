import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOperatorConfig } from "@/lib/operator-config";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: `${t("Legal notice")} — Ascend` };
}
// Operator config is read from process.env at request time, not build
// time - the same Docker image is meant to be deployed by many different
// operators with different env vars, so this must never be statically
// prerendered (which would bake in whatever was set during `docker build`).
export const dynamic = "force-dynamic";

export default async function ImpressumPage() {
  const operator = getOperatorConfig();
  const { t } = await getT();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <Link href="/" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        {t("Back")}
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">{t("Legal notice")}</h1>

      {!operator.isConfigured ? (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-5 text-sm">
          <p className="font-medium text-destructive">
            {t("This operator hasn't provided a legal notice yet.")}
          </p>
          <p className="text-muted-foreground">
            {t("Ascend is open-source software and can be self-hosted by anyone. Whoever operates this instance must set the environment variables")}{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">OPERATOR_NAME</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">OPERATOR_ADDRESS</code> {t("and")}{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">OPERATOR_EMAIL</code>{" "}
            {t("before the application goes live with real users (in Germany generally mandatory under § 5 DDG as soon as the offering isn't purely private/non-commercial).")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 text-sm leading-relaxed">
          <section>
            <h2 className="mb-1 font-semibold">{t("Information pursuant to § 5 DDG")}</h2>
            <p className="whitespace-pre-line text-muted-foreground">
              {operator.name}
              {"\n"}
              {operator.address}
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold">{t("Contact")}</h2>
            <p className="text-muted-foreground">
              {t("Email:")} {operator.email}
              {operator.phone && (
                <>
                  <br />
                  {t("Phone:")} {operator.phone}
                </>
              )}
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold">{t("Responsible for content pursuant to § 18(2) MStV")}</h2>
            <p className="text-muted-foreground">{operator.name}</p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold">{t("Disclaimer")}</h2>
            <p className="text-muted-foreground">
              {t("Despite careful review of content, we accept no liability for the content of external links. The operators of linked pages are solely responsible for their content.")}
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold">{t("Software")}</h2>
            <p className="text-muted-foreground">
              {t("This instance runs on Ascend, an open-source application (MIT license). The source code can be self-hosted unmodified or modified; this page describes only the operator of this particular instance, not the software project itself.")}
            </p>
          </section>
        </div>
      )}

      {t("English courtesy translation - the German version is legally binding.") !== "English courtesy translation - the German version is legally binding." && (
        <p className="text-xs text-muted-foreground">{t("English courtesy translation - the German version is legally binding.")}</p>
      )}
    </main>
  );
}
