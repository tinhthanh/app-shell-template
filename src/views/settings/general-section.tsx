import { confirm } from "@/components/confirm";
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { LANGUAGE_IDS, LANGUAGES, type LanguageChoice, t } from "@/lib/i18n";
import { resetPrefs, setPrefs, usePrefs } from "@/lib/prefs";
import { Segmented } from "@/views/settings/controls";
import { Code, fill, SettingsGroup, SettingsPage, SettingsRow, Value } from "@/views/settings/rows";

// General shows one of each control a settings row takes: a segmented
// pick, a read-only value and a button (a switch is on the Kit page), and
// the Language setting (lib/i18n.ts), which redraws the app in the one
// chosen. Replace the rest with yours.
export function GeneralSection() {
  const collapsed = usePrefs((p) => p.sidebarCollapsed);
  const language = usePrefs((p) => p.language);

  return (
    <SettingsPage title={t("settings.section.general")}>
      <SettingsGroup title={t("settings.general.languageGroup")}>
        <SettingsRow label={t("settings.general.language")} description={t("settings.general.languageDescription")}>
          {/* Each language is named in its own, and marked so, so a screen reader says it right. */}
          <Segmented<LanguageChoice>
            value={language}
            options={[{ value: "system", label: t("settings.matchSystem") }, ...LANGUAGE_IDS.map((id) => ({ value: id, label: <span lang={id}>{LANGUAGES[id].name}</span> }))]}
            onChange={(language) => setPrefs({ language })}
          />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title={t("settings.general.sidebarGroup")}>
        <SettingsRow label={t("settings.general.sidebar")} description={t("settings.general.sidebarDescription")}>
          <Segmented
            value={collapsed ? "rail" : "open"}
            options={[
              { value: "open", label: t("settings.general.sidebarOpen") },
              { value: "rail", label: t("settings.general.sidebarRail") },
            ]}
            onChange={(v) => setPrefs({ sidebarCollapsed: v === "rail" })}
          />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title={t("settings.general.storageGroup")} description={t("settings.general.storageDescription")}>
        <SettingsRow
          label={t("settings.general.where")}
          description={fill(t("settings.general.whereDescription"), { storage: <Code>localStorage</Code>, prefs: <Code>app.prefs</Code>, ui: <Code>app.ui</Code> })}
        >
          <Value>{t("settings.general.thisBrowser")}</Value>
        </SettingsRow>
        <SettingsRow label={t("settings.general.reset")} description={t("settings.general.resetDescription")}>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              confirm({
                title: t("settings.general.resetTitle"),
                description: t("settings.general.resetConfirm"),
                confirm: t("settings.general.resetButton"),
                destructive: true,
                run: () => {
                  resetPrefs();
                  toastManager.add({ type: "success", title: t("settings.general.resetDone") });
                },
              })
            }
          >
            {t("settings.general.resetButton")}
          </Button>
        </SettingsRow>
      </SettingsGroup>
    </SettingsPage>
  );
}
