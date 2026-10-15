import { CheckIcon, ChevronDownIcon, InfoIcon, MailIcon, PlusIcon, SearchIcon, SettingsIcon, TrashIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

import { confirm } from "@/components/confirm";
import { ErrorNote } from "@/components/error-note";
import { FilterChip } from "@/components/filter-chip";
import { PickOne } from "@/components/pick-one";
import { PixelLoader } from "@/components/pixel-loader";
import { SimpleSelect } from "@/components/simple-select";
import { Tip } from "@/components/tip";
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPopup, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldControl, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Popover, PopoverDescription, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue } from "@/components/ui/progress";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetPanel, SheetPopup, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { ApiError } from "@/lib/errors";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { hashTone, TONES, toneVar } from "@/themes/tones";
import { type KitSectionId, KIT_SECTIONS as SECTIONS } from "@/views/kit/sections";
import { ViewHeader } from "@/views/view-header";

// Kit shows the pieces the app is built from, in the theme in use: the
// coss ui components (components/ui) and the app's own (components/). A
// place to see what there is, and to check a theme against all of it.
// Each section is addressed (#/kit/buttons); the list is in sections.ts.

export function KitView() {
  const view = useStore((s) => s.view);
  const current = (view.kind === "kit" && SECTIONS.some((s) => s.id === view.section) ? view.section : "buttons") as KitSectionId;
  return (
    <div className="flex h-full flex-col" data-testid="kit">
      <ViewHeader title="Kit" description="The components, in the theme in use" />
      <div className="flex min-h-0 flex-1">
        <nav aria-label="Kit sections" className="flex w-40 shrink-0 flex-col gap-px border-r px-2 pt-4 max-[900px]:hidden">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-current={s.id === current ? "page" : undefined}
              data-testid={`kit-nav-${s.id}`}
              onClick={() => useStore.getState().setView({ kind: "kit", section: s.id })}
              className={cn(
                "flex h-7.5 w-full items-center rounded-md px-2.5 text-left text-[0.8125rem] transition-colors",
                s.id === current ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              {s.title}
            </button>
          ))}
        </nav>
        <div className="min-w-0 flex-1 overflow-y-auto" data-testid={`kit-${current}`}>
          <div className="mx-auto w-full max-w-3xl px-8 pt-6 pb-16">
            {current === "buttons" && <Buttons />}
            {current === "inputs" && <Inputs />}
            {current === "choices" && <Choices />}
            {current === "feedback" && <Feedback />}
            {current === "overlays" && <Overlays />}
            {current === "data" && <Data />}
            {current === "tones" && <Tones />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-medium text-[0.8125rem] text-muted-foreground">{title}</h2>
      {description && <p className="mt-0.5 text-muted-foreground text-xs">{description}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border bg-card/40 p-4">{children}</div>
    </section>
  );
}

function Buttons() {
  return (
    <>
      <Section title="Button variants">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="destructive-outline">Destructive outline</Button>
      </Section>
      <Section title="Sizes and states">
        <Button size="xs">Extra small</Button>
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
        <Button disabled>Disabled</Button>
        <Button loading>Loading</Button>
        <Button variant="outline">
          <PlusIcon />
          With an icon
        </Button>
        <Tip label="Settings">
          <Button variant="outline" size="icon" aria-label="Settings">
            <SettingsIcon />
          </Button>
        </Tip>
      </Section>
      <Section title="Badges">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="error">Error</Badge>
        <Badge variant="info">Info</Badge>
        <Badge variant="destructive">Destructive</Badge>
      </Section>
      <Section title="Keys" description="Written for a Mac, shown with Ctrl elsewhere.">
        <Kbd>⌘K</Kbd>
        <Kbd>⌘⇧P</Kbd>
        <Kbd>esc</Kbd>
        <Kbd>↵</Kbd>
      </Section>
    </>
  );
}

function Inputs() {
  const [value, setValue] = useState("");
  return (
    <>
      <Section title="Text">
        <Input placeholder="Plain" aria-label="Plain" className="w-56" />
        <Input size="sm" placeholder="Small" aria-label="Small" className="w-40" />
        <Input placeholder="Disabled" aria-label="Disabled" disabled className="w-40" />
        <InputGroup className="w-64">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput placeholder="With an addon" aria-label="With an addon" />
        </InputGroup>
        <Textarea placeholder="A longer text" aria-label="A longer text" className="w-full" />
      </Section>
      <Section title="A field" description="Label, control and description, named for screen readers.">
        <Field className="w-72">
          <FieldLabel>Email</FieldLabel>
          <FieldControl render={<Input type="email" placeholder="you@example.com" value={value} onChange={(e) => setValue(e.currentTarget.value)} />} />
          <FieldDescription>Where receipts go.</FieldDescription>
        </Field>
      </Section>
      <Section title="Select">
        <SimpleSelect
          aria-label="Fruit"
          className="w-48"
          value="apple"
          onChange={() => {}}
          options={[
            { value: "apple", label: "Apple" },
            { value: "pear", label: "Pear" },
            { value: "plum", label: "Plum" },
          ]}
        />
      </Section>
    </>
  );
}

function Choices() {
  const [pick, setPick] = useState("list");
  const [chips, setChips] = useState<Set<string>>(new Set(["web"]));
  return (
    <>
      <Section title="Switch and checkbox">
        <label className="flex items-center gap-2 text-sm">
          <Switch defaultChecked /> Email me
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch /> Text me
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox defaultChecked /> Remember me
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox /> Subscribe
        </label>
      </Section>
      <Section title="Radio group">
        <RadioGroup defaultValue="a" aria-label="Choice">
          {["a", "b", "c"].map((v) => (
            <label key={v} className="flex items-center gap-2 text-sm">
              <Radio value={v} /> Option {v.toUpperCase()}
            </label>
          ))}
        </RadioGroup>
      </Section>
      <Section title="PickOne" description="The app's one control for picking one of a few values.">
        <PickOne
          label="Layout"
          value={pick}
          onChange={setPick}
          options={[
            { value: "list", label: "List" },
            { value: "board", label: "Board" },
            { value: "calendar", label: "Calendar" },
          ]}
        />
      </Section>
      <Section title="FilterChip" description="Any number at once; off to start.">
        {["web", "mobile", "backend"].map((t) => (
          <FilterChip
            key={t}
            pressed={chips.has(t)}
            onPressedChange={(on) =>
              setChips((s) => {
                const n = new Set(s);
                if (on) n.add(t);
                else n.delete(t);
                return n;
              })
            }
          >
            {t}
          </FilterChip>
        ))}
      </Section>
      <Section title="Tabs">
        <Tabs defaultValue="one" className="w-full">
          <TabsList>
            <TabsTab value="one">First</TabsTab>
            <TabsTab value="two">Second</TabsTab>
            <TabsTab value="three">Third</TabsTab>
          </TabsList>
          <TabsPanel value="one" className="pt-3 text-muted-foreground text-sm">
            The first panel.
          </TabsPanel>
          <TabsPanel value="two" className="pt-3 text-muted-foreground text-sm">
            The second panel.
          </TabsPanel>
          <TabsPanel value="three" className="pt-3 text-muted-foreground text-sm">
            The third panel.
          </TabsPanel>
        </Tabs>
      </Section>
      <Section title="Slider">
        <Slider defaultValue={40} aria-label="Amount" className="w-64" />
      </Section>
    </>
  );
}

function Feedback() {
  return (
    <>
      <Section title="Alerts">
        <Alert className="w-full">
          <InfoIcon />
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>Something worth knowing, in one line.</AlertDescription>
        </Alert>
        <ErrorNote
          className="w-full"
          error={new ApiError("upstream connect error or disconnect/reset before headers", 503, "unavailable")}
          onRetry={() => toastManager.add({ title: "Tried again" })}
        />
      </Section>
      <Section title="Toasts">
        <Button variant="outline" onClick={() => toastManager.add({ title: "Saved", description: "The project was updated.", type: "success" })}>
          Success
        </Button>
        <Button variant="outline" onClick={() => toastManager.add({ title: "Couldn't save", description: "The server is busy.", type: "error" })}>
          Error
        </Button>
        <Button variant="outline" onClick={() => toastManager.add({ title: "Working…", type: "loading" })}>
          Loading
        </Button>
        <Button variant="outline" onClick={() => toastManager.add({ title: "Undo?", description: "The project was archived.", actionProps: { children: "Undo", onClick: () => {} } })}>
          With an action
        </Button>
      </Section>
      <Section title="Waiting">
        <Spinner />
        <PixelLoader label="Reading projects…" />
        <div className="flex w-full flex-col gap-2">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      </Section>
      <Section title="Progress">
        <Progress value={64} className="w-72">
          <ProgressLabel>Uploading</ProgressLabel>
          <ProgressValue />
          <ProgressTrack>
            <ProgressIndicator />
          </ProgressTrack>
        </Progress>
      </Section>
      <Section title="Empty">
        <Empty className="w-full">
          <EmptyHeader>
            <EmptyTitle>Nothing here yet</EmptyTitle>
            <EmptyDescription>When there is, it shows here.</EmptyDescription>
          </EmptyHeader>
          <Button size="sm" variant="outline">
            <PlusIcon />
            Add one
          </Button>
        </Empty>
      </Section>
    </>
  );
}

function Overlays() {
  return (
    <>
      <Section title="Dialog and sheet">
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>Open a dialog</DialogTrigger>
          <DialogPopup>
            <DialogHeader>
              <DialogTitle>A dialog</DialogTitle>
              <DialogDescription>Pinned near the top, so it stays put as its content grows.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
              <DialogClose render={<Button />}>Done</DialogClose>
            </DialogFooter>
          </DialogPopup>
        </Dialog>
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>Open a sheet</SheetTrigger>
          <SheetPopup className="sm:max-w-sm">
            <SheetHeader>
              <SheetTitle>A sheet</SheetTitle>
              <SheetDescription>Slides in from the side for a longer task.</SheetDescription>
            </SheetHeader>
            <SheetPanel className="text-muted-foreground text-sm">Its content scrolls on its own.</SheetPanel>
            <SheetFooter>
              <Button>Done</Button>
            </SheetFooter>
          </SheetPopup>
        </Sheet>
        <Button
          variant="destructive-outline"
          onClick={() =>
            confirm({
              title: "Delete the project?",
              description: "This can't be undone.",
              detail: "Shop",
              confirm: "Delete",
              destructive: true,
              run: () => void toastManager.add({ title: "Deleted (not really)" }),
            })
          }
        >
          <TrashIcon />
          Confirm something
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            confirm({
              title: "Archive the project?",
              description: "The server will refuse this one, so the dialog stays open with the reason.",
              confirm: "Archive",
              run: async () => {
                throw new ApiError("archive is not allowed while the project has open orders", 409, "conflict");
              },
            })
          }
        >
          Confirm that fails
        </Button>
      </Section>
      <Section title="Menu and popover">
        <Menu>
          <MenuTrigger render={<Button variant="outline" />}>
            Menu
            <ChevronDownIcon />
          </MenuTrigger>
          <MenuPopup align="start" className="min-w-44">
            <MenuItem>
              <MailIcon />
              Send
            </MenuItem>
            <MenuItem>
              <CheckIcon />
              Mark done
            </MenuItem>
            <MenuSeparator />
            <MenuItem variant="destructive">
              <TrashIcon />
              Delete
            </MenuItem>
          </MenuPopup>
        </Menu>
        <Popover>
          <PopoverTrigger render={<Button variant="outline" />}>Popover</PopoverTrigger>
          <PopoverPopup className="max-w-64">
            <PopoverTitle>About this</PopoverTitle>
            <PopoverDescription>A little more, where it is asked for.</PopoverDescription>
          </PopoverPopup>
        </Popover>
        <Tip label="A tooltip, on hover and on focus">
          <Button variant="outline">Tooltip</Button>
        </Tip>
      </Section>
      <Section title="Accordion">
        <Accordion className="w-full" defaultValue={["a"]}>
          <AccordionItem value="a">
            <AccordionTrigger>What is this?</AccordionTrigger>
            <AccordionPanel>A section that folds.</AccordionPanel>
          </AccordionItem>
          <AccordionItem value="b">
            <AccordionTrigger>And this?</AccordionTrigger>
            <AccordionPanel>Another one.</AccordionPanel>
          </AccordionItem>
        </Accordion>
      </Section>
    </>
  );
}

const ROWS = [
  { name: "Shop", owner: "alex", status: "active", updated: "12m ago" },
  { name: "Public API", owner: "sam", status: "active", updated: "45m ago" },
  { name: "Android app", owner: "priya", status: "paused", updated: "1d ago" },
];

function Data() {
  return (
    <>
      <Section title="Table" description="Rows take their height from density (Settings › Appearance).">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((r) => (
              <TableRow key={r.name} className="h-row">
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <Avatar className="size-5">
                      <AvatarFallback className="text-[0.625rem]">{r.owner.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {r.owner}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={r.status === "active" ? "success" : "warning"} className="capitalize">
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">{r.updated}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
      <Section title="Cards">
        <Card className="w-72">
          <CardHeader>
            <CardTitle>A card</CardTitle>
            <CardDescription>One outline per section.</CardDescription>
          </CardHeader>
          <CardPanel className="text-muted-foreground text-sm">Its body.</CardPanel>
          <CardFooter>
            <Button size="sm" variant="outline">
              Act
            </Button>
          </CardFooter>
        </Card>
      </Section>
    </>
  );
}

function Tones() {
  return (
    <>
      <Section title="The six tones" description="For tags and groups: a hue each, at the lightness this theme reads them at, clear of the state colours.">
        {TONES.map((t) => (
          <span key={t} className="rounded-full px-2.5 py-0.5 text-xs" style={{ color: toneVar(t), background: `color-mix(in srgb, ${toneVar(t)} 15%, transparent)` }}>
            {t}
          </span>
        ))}
      </Section>
      <Section title="By name" description="hashTone picks the same tone for a name every time.">
        {["web", "mobile", "backend", "ops", "payments", "design"].map((t) => (
          <span key={t} className="rounded-full px-2.5 py-0.5 text-xs" style={{ color: toneVar(hashTone(t)), background: `color-mix(in srgb, ${toneVar(hashTone(t))} 15%, transparent)` }}>
            {t}
          </span>
        ))}
      </Section>
      <Section title="The state colours" description="Green succeeds, amber warns, red fails, blue informs.">
        {(["success", "warning", "destructive", "info"] as const).map((s) => (
          <span key={s} className={cn("rounded-full px-2.5 py-0.5 text-xs", `bg-${s}/16 text-${s}-foreground`)}>
            {s}
          </span>
        ))}
      </Section>
    </>
  );
}
