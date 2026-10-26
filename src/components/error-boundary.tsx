import { TriangleAlertIcon } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { t } from "@/lib/i18n";
import { report } from "@/lib/report";

type Props = {
  children: ReactNode;
  // What the boundary guards, for the message: "Projects", "a dialog".
  scope?: string;
  // Shown as a way out, such as back home.
  onLeave?: () => void;
  leaveLabel?: string;
  // What stands in for a small part that broke (the sheet's list), instead of the full message.
  fallback?: ReactNode;
};
type State = { error?: Error; stack?: string; details: boolean };

// ErrorBoundary keeps a render that throws from taking more than its part of
// the window: around a view, the sidebar and every other view keep working.
// Without it React replaces the tree with nothing, the window goes white,
// and what threw is in a console nobody opens. Showing it on screen makes
// a report from someone else's machine actionable.
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { details: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ stack: info.componentStack ?? undefined });
    // To the reporter (the console until one is set, lib/report.ts).
    report(error, { scope: this.props.scope ?? "the app", componentStack: info.componentStack ?? "" });
  }

  override render() {
    const { error, stack, details } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;
    const { scope, onLeave, leaveLabel } = this.props;
    const detail = [error.stack || `${error.name}: ${error.message}`, stack && `Component stack:${stack}`].filter(Boolean).join("\n\n");
    return (
      <div className="flex h-full min-h-0 items-center justify-center overflow-y-auto p-6">
        <Empty className="max-w-xl">
          <EmptyHeader>
            <EmptyMedia>
              <TriangleAlertIcon />
            </EmptyMedia>
            <EmptyTitle>{scope ? t("common.boundary.titleIn", { scope }) : t("common.boundary.title")}</EmptyTitle>
            <EmptyDescription>
              {scope ? t("common.boundary.restWorks") : ""}
              {error.message || String(error)}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-wrap justify-center gap-2">
              {onLeave && (
                <Button
                  onClick={() => {
                    this.setState({ error: undefined, details: false });
                    onLeave();
                  }}
                >
                  {leaveLabel ?? t("common.boundary.backHome")}
                </Button>
              )}
              <Button variant="outline" onClick={() => this.setState({ error: undefined, details: false })}>
                {t("common.tryAgain")}
              </Button>
              <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(detail)}>
                {t("common.boundary.copyDetails")}
              </Button>
            </div>
            <button type="button" className="text-muted-foreground text-meta hover:text-foreground" onClick={() => this.setState({ details: !details })}>
              {details ? t("common.boundary.hideDetails") : t("common.boundary.showDetails")}
            </button>
            {details && <pre className="max-h-64 w-full overflow-auto rounded-md bg-muted p-3 text-start text-meta leading-relaxed whitespace-pre-wrap select-text">{detail}</pre>}
          </EmptyContent>
        </Empty>
      </div>
    );
  }
}
