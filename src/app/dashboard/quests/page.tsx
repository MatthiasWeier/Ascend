import { QuestsBoard } from "@/components/quests/quests-board";
import { getT } from "@/lib/i18n/server";

export default async function QuestsPage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("Sidequests")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Your own goals with a deadline - e.g. a handstand by the end of the year. You get regular reminders and your groups can cheer you on.")}
        </p>
      </div>
      <QuestsBoard />
    </div>
  );
}
