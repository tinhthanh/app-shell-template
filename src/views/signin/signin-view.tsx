import { useState } from "react";

import { toastError } from "@/components/error-note";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Field, FieldControl, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ApiError, client } from "@/lib/api";
import { APP_NAME } from "@/lib/app";
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
              else toastError(err, "Couldn't sign in");
            } finally {
              setBusy(false);
            }
          }}
        >
          <CardHeader>
            <CardTitle>Sign in to {APP_NAME}</CardTitle>
            <CardDescription>With the account your team gave you.</CardDescription>
          </CardHeader>
          <CardPanel className="flex flex-col gap-4">
            <Field name="email" validate={(v) => (/\S+@\S+/.test(String(v ?? "")) ? null : "An email address, please.")}>
              <FieldLabel>Email</FieldLabel>
              <FieldControl render={<Input type="email" autoComplete="username" autoFocus />} />
              <FieldError />
            </Field>
            <Field name="password" validate={(v) => (String(v ?? "") ? null : "A password, please.")}>
              <FieldLabel>Password</FieldLabel>
              <FieldControl render={<Input type="password" autoComplete="current-password" />} />
              <FieldError />
            </Field>
            <Button type="submit" loading={busy} className="mt-2">
              Sign in
            </Button>
          </CardPanel>
        </Form>
      </Card>
    </main>
  );
}
