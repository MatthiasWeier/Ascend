import { BodyView } from "@/components/body-view";
import { getT } from "@/lib/i18n/server";

export default async function BodyPage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("Körper")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Wie stark hast du welchen Muskel zuletzt trainiert? Grau = kaum, Rot = viel. Blau markiert deine Wünsche, Orange Verletzungen.")}
        </p>
      </div>
      <BodyView />
    </div>
  );
}
