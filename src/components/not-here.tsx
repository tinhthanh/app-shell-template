import { BanIcon, CompassIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { ApiError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { useStore } from "@/lib/store";

// NotFound and Forbidden are the two ways something isn't there for the
// person: it doesn't exist (an address the app doesn't know, a record the
// server answers 404 for) or it isn't theirs to see (a 403). Both say so in
// plain words, with no Try again, since trying again changes nothing.
// ResourceView (resource-view.tsx) draws them for a read that answered so;
// App.tsx draws NotFound for the "missing" view.

// notHere says which of the two an error is, if either.
export function notHere(error: unknown): "missing" | "forbidden" | undefined {
  if (!(error instanceof ApiError)) return undefined;
  return error.status === 404 ? "missing" : error.status === 403 ? "forbidden" : undefined;
}

function NotHere({ icon, title, description, testid, home }: { icon: React.ReactNode; title: string; description: string; testid?: string; home?: boolean }) {
  return (
    <Empty className="h-full" data-testid={testid}>
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        {/* The page's heading when it is the whole page; under a record's header, the next level. */}
        <EmptyTitle>{home ? <h1>{title}</h1> : <h2>{title}</h2>}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {home && (
        <EmptyContent>
          <Button variant="outline" onClick={() => useStore.getState().setView({ kind: "home" })}>
            {t("common.goHome")}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}

// NotFound: home adds a way to Home, for a page with no other way out.
export function NotFound({ testid, home }: { testid?: string; home?: boolean }) {
  return <NotHere icon={<CompassIcon />} title={t("common.notFound.title")} description={t("common.notFound.description")} testid={testid} home={home} />;
}

export function Forbidden({ testid, home }: { testid?: string; home?: boolean }) {
  return <NotHere icon={<BanIcon />} title={t("common.forbidden.title")} description={t("common.forbidden.description")} testid={testid} home={home} />;
}
