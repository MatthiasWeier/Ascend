import { QuestsBoard } from "@/components/quests/quests-board";
import { getT } from "@/lib/i18n/server";

export default async function QuestsPage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("Sidequests")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Deine eigenen Ziele mit Frist - z. B. ein Handstand bis Ende des Jahres. Du wirst regelmäßig erinnert, deine Gruppen können mitfiebern.")}
        </p>
      </div>
      <QuestsBoard />
    </div>
  );
}
