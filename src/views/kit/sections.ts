// The Kit page's sections, each addressed (#/kit/buttons). On their own so
// the axe spec (e2e/a11y.spec.ts) visits every one without a copy of the list.
export const KIT_SECTIONS = [
  { id: "buttons", title: "Buttons" },
  { id: "inputs", title: "Inputs" },
  { id: "choices", title: "Choices" },
  { id: "feedback", title: "Feedback" },
  { id: "overlays", title: "Overlays" },
  { id: "data", title: "Data" },
  { id: "tones", title: "Tones" },
  { id: "shell", title: "Shell" },
] as const;

export type KitSectionId = (typeof KIT_SECTIONS)[number]["id"];
