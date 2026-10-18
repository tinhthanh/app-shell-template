import { Button } from "@/components/ui/button";
import { openWhatsNew } from "@/components/whats-new/whats-new-dialog";
import { isMock } from "@/lib/api";
import { APP_COMMIT, APP_NAME, APP_VERSION } from "@/lib/app";
import { t } from "@/lib/i18n";
import { SettingsGroup, SettingsPage, SettingsRow, Value } from "@/views/settings/rows";

export function AboutSection() {
  return (
    <SettingsPage title={t("settings.section.about")}>
      <SettingsGroup title={APP_NAME}>
        <SettingsRow label={t("settings.about.version")} description={t("settings.about.versionDescription")}>
          <Value>{APP_VERSION}</Value>
          <Button size="sm" variant="outline" onClick={openWhatsNew}>
            {t("settings.about.whatsNew")}
          </Button>
        </SettingsRow>
        <SettingsRow label={t("settings.about.build")} description={t("settings.about.buildDescription")}>
          <Value>{APP_COMMIT || t("settings.about.notGit")}</Value>
        </SettingsRow>
        <SettingsRow label={t("settings.about.data")} description={t("settings.about.dataDescription")}>
          <Value>{isMock() ? t("settings.about.mock") : t("settings.about.api")}</Value>
        </SettingsRow>
      </SettingsGroup>
    </SettingsPage>
  );
}
