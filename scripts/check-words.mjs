// Fails when a word a person reads is written straight into a view or a
// component in English, instead of coming from t() (src/lib/i18n.ts,
// docs/decisions/0013-words.md): such a word stays English in every
// language.
//
// What counts as a word: text between tags with two letters together,
// and a string (or template) with letters given to a prop or an object
// key that is read on screen (label, title, description, placeholder,
// aria-label and the like), or to toastError and announce. Class names,
// ids, values, keys and paths are left alone.
//
// The Kit page (src/views/kit/) is for whoever builds the app and stays
// English; the UI kit (src/components/ui/) has no words of its own.
//
//   node scripts/check-words.mjs     check src/
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import ts from "typescript";

const app = resolve(import.meta.dirname, "..");
const roots = ["src/App.tsx", "src/components", "src/views", "src/hooks"].map((p) => join(app, p));
const SKIP = [/^src\/components\/ui\//, /^src\/views\/kit\//];

// Props and object keys whose string is read on screen.
const SHOWN = new Set(["label", "title", "description", "placeholder", "aria-label", "detail", "confirm", "failTitle", "submit", "leaveLabel", "scope"]);
// Calls whose string arguments are read on screen.
const SHOWN_CALLS = new Set(["toastError", "announce"]);

// Files that may still carry a word, with why. Keep it short, and take a
// file out once its words are in a table.
const ALLOW = new Map([]);

const LETTERS = /[A-Za-z]{2,}/;
// Text that is a mark, not a word: a key, a unit, a symbol.
const NOT_A_WORD = /^(⌘|⇧|⌥|esc|px|mock)$/i;

async function* files(path) {
  if (/\.tsx?$/.test(path)) {
    yield path;
    return;
  }
  for (const e of await readdir(path, { withFileTypes: true })) {
    const p = join(path, e.name);
    if (e.isDirectory()) yield* files(p);
    else if (/\.tsx?$/.test(e.name) && !e.name.endsWith(".test.ts")) yield p;
  }
}

// A file's path (src/lib/api.ts) is a name, the same in every language.
const PATH = /^[\w@./-]+\.(ts|tsx|js|mjs|json|css|md)$/;
// A message key (settings.section.general) or a name in code (app.prefs).
const KEY = /^[A-Za-z]+(\.[\w-]+)+$/;
const isWord = (s) => LETTERS.test(s) && !NOT_A_WORD.test(s.trim()) && !PATH.test(s.trim()) && !KEY.test(s.trim());
// Text in code or a key cap is a name, and what is hidden from a screen
// reader is a picture (a theme's preview): neither is a word to translate.
const CODE = new Set(["code", "Code", "kbd", "Kbd", "pre"]);
const tagOf = (el) => (ts.isJsxElement(el) ? el.openingElement.tagName.getText() : undefined);
const hidden = (el) =>
  ts.isJsxElement(el) && el.openingElement.attributes.properties.some((a) => ts.isJsxAttribute(a) && a.name.getText() === "aria-hidden" && (!a.initializer || /true/.test(a.initializer.getText())));
const literal = (n) =>
  n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : n && ts.isTemplateExpression(n) ? n.head.text + n.templateSpans.map((s) => s.literal.text).join(" ") : undefined;

const problems = [];
for (const root of roots) {
  for await (const file of files(root)) {
    const rel = relative(app, file);
    if (SKIP.some((r) => r.test(rel)) || ALLOW.has(rel)) continue;
    const text = await readFile(file, "utf8");
    const src = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const at = (node, what) => problems.push(`${rel}:${src.getLineAndCharacterOfPosition(node.getStart()).line + 1}  ${what}`);
    const visit = (node) => {
      if (hidden(node)) return;
      if (ts.isJsxText(node) && isWord(node.text) && !CODE.has(tagOf(node.parent))) at(node, JSON.stringify(node.text.trim()));
      // scope on an HTML element (<th scope="col">) is the table's, not a word.
      else if (ts.isJsxAttribute(node) && SHOWN.has(node.name.getText()) && !(node.name.getText() === "scope" && /^[a-z]/.test(node.parent.parent.tagName.getText()))) {
        const init = node.initializer && ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer;
        const s = literal(init);
        if (s !== undefined && isWord(s)) at(node, `${node.name.getText()}=${JSON.stringify(s)}`);
      } else if (ts.isPropertyAssignment(node) && SHOWN.has(node.name.getText().replace(/"/g, ""))) {
        const s = literal(node.initializer);
        if (s !== undefined && isWord(s)) at(node, `${node.name.getText()}: ${JSON.stringify(s)}`);
      } else if (ts.isCallExpression(node) && SHOWN_CALLS.has(node.expression.getText())) {
        for (const a of node.arguments) {
          const s = literal(a);
          if (s !== undefined && isWord(s)) at(a, `${node.expression.getText()}(${JSON.stringify(s)})`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(src);
  }
}

if (problems.length) {
  console.error(`check-words: ${problems.length} word(s) written in English instead of t() (src/lib/i18n.ts):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log("check-words: every word in the views and components comes from t()");
