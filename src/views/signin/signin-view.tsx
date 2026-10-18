import { useState } from "react";

import { toastError } from "@/components/error-note";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Field, FieldControl, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ApiError, client } from "@/lib/api";
import { APP_NAME } from "@/lib/app";
import { t } from "@/lib/i18n";
import { signedIn } from "@/lib/session";

// SignInView takes the whole window while nobody is signed in (App.tsx):
// an email and a password, in the app's own words when refused. Signing in
// leaves the view that was in front where it was.
export function SignInView() {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <main className="flex h-svh items-center justify-center bg-background p-6 text-foreground" data-testid="signin">
      <Card className="w-full max-w-sm">
        <Form
          errors={errors}
          onFormSubmit={async (values) => {
            setErrors({});
            setBusy(true);
            try {
              signedIn(await client.signIn(String(values.email).trim(), String(values.password)));
            } catch (err) {
              if (err instanceof ApiError && (err.status === 401 || err.code === "invalid")) setErrors({ password: err.message });
              else toastError(err, t("signin.failed"));
            } finally {
              setBusy(false);
            }
          }}
        >
          <CardHeader>
            <CardTitle>{t("signin.title", { app: APP_NAME })}</CardTitle>
            <CardDescription>{t("signin.description")}</CardDescription>
          </CardHeader>
          <CardPanel className="flex flex-col gap-4">
            <Field name="email" validate={(v) => (/\S+@\S+/.test(String(v ?? "")) ? null : t("signin.email.needed"))}>
              <FieldLabel>{t("signin.email")}</FieldLabel>
              <FieldControl render={<Input type="email" autoComplete="username" autoFocus />} />
              <FieldError />
            </Field>
            <Field name="password" validate={(v) => (String(v ?? "") ? null : t("signin.password.needed"))}>
              <FieldLabel>{t("signin.password")}</FieldLabel>
              <FieldControl render={<Input type="password" autoComplete="current-password" />} />
              <FieldError />
            </Field>
            <Button type="submit" loading={busy} className="mt-2">
              {t("signin.submit")}
            </Button>
          </CardPanel>
        </Form>
      </Card>
    </main>
  );
}
