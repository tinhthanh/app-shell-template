import { isMock } from "@/lib/api";
import { APP_COMMIT, APP_NAME, APP_VERSION } from "@/lib/app";
import { SettingsGroup, SettingsPage, SettingsRow, Value } from "@/views/settings/rows";

export function AboutSection() {
  return (
    <SettingsPage title="About">
      <SettingsGroup title={APP_NAME}>
        <SettingsRow label="Version" description="From package.json, at build time.">
          <Value>{APP_VERSION}</Value>
        </SettingsRow>
        <SettingsRow label="Build" description="The commit this build was made from.">
          <Value>{APP_COMMIT || "not a git checkout"}</Value>
        </SettingsRow>
        <SettingsRow label="Data" description="Where the views read from (src/lib/api.ts).">
          <Value>{isMock() ? "mock fixtures" : "the API"}</Value>
        </SettingsRow>
      </SettingsGroup>
    </SettingsPage>
  );
}
