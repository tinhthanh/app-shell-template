import { confirm } from "@/components/confirm";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toastManager } from "@/components/ui/toast";
import { resetPrefs, setPrefs, usePrefs } from "@/lib/prefs";
import { Segmented } from "@/views/settings/controls";
import { Code, SettingsGroup, SettingsPage, SettingsRow, Value } from "@/views/settings/rows";

// General shows one of each control a settings row takes: a switch, a
// segmented pick, a read-only value and a button. Replace them with yours.
export function GeneralSection() {
  const confirmLeaving = usePrefs((p) => p.confirmBeforeLeaving);
  const collapsed = usePrefs((p) => p.sidebarCollapsed);

  return (
    <SettingsPage title="General">
      <SettingsGroup title="Sidebar">
        <SettingsRow label="Sidebar" description="Folded, it is a rail of icons. ⌘\ toggles it; drag its edge to size it.">
          <Segmented
            value={collapsed ? "rail" : "open"}
            options={[
              { value: "open", label: "Open" },
              { value: "rail", label: "Rail" },
            ]}
            onChange={(v) => setPrefs({ sidebarCollapsed: v === "rail" })}
          />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Behaviour">
        <SettingsRow label="Confirm before leaving" description="An example switch: a boolean preference, saved as it changes.">
          <Switch checked={confirmLeaving} onCheckedChange={(confirmBeforeLeaving) => setPrefs({ confirmBeforeLeaving })} />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Storage" description="Preferences live in this browser's storage; nothing leaves the computer.">
        <SettingsRow
          label="Where"
          description={
            <>
              <Code>localStorage</Code> under <Code>app.prefs</Code> and <Code>app.ui</Code>.
            </>
          }
        >
          <Value>this browser</Value>
        </SettingsRow>
        <SettingsRow label="Reset preferences" description="Puts every setting back to its default. The theme stays.">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              confirm({
                title: "Reset preferences?",
                description: "Density, text size, the sidebar and every other setting go back to their defaults. The theme stays.",
                confirm: "Reset",
                destructive: true,
                run: () => {
                  resetPrefs();
                  toastManager.add({ type: "success", title: "Preferences reset" });
                },
              })
            }
          >
            Reset
          </Button>
        </SettingsRow>
      </SettingsGroup>
    </SettingsPage>
  );
}
