// Fails when a module the unit tests load (pnpm test: node --test with
// --experimental-strip-types, no bundler) could not load in node:
//
//   - a runtime import by the "@/" alias, or a relative one without its
//     extension (node resolves neither); type-only imports are erased and
//     may use "@/";
//   - an enum, a namespace, or a constructor parameter property (strip-only
//     mode has no transforms);
//   - a .tsx module (node does not strip JSX).
//
// It starts from every *.test.ts under src/ and follows the imports.
//
//   node scripts/check-node-imports.mjs
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");

async function* tests(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* tests(p);
    else if (e.name.endsWith(".test.ts")) yield p;
  }
}

const problems = [];
const seen = new Set();

async function visit(file, from) {
  if (seen.has(file)) return;
  seen.add(file);
  const rel = relative(root, file);
  if (file.endsWith(".tsx")) {
    problems.push(`${rel}: a .tsx module, loaded from ${relative(root, from)}; node does not strip JSX`);
    return;
  }
  if (!existsSync(file)) {
    problems.push(`${relative(root, from)}: imports ${rel}, which does not exist`);
    return;
  }
  const text = await readFile(file, "utf8");
  const src = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const at = (node) => `${rel}:${src.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
  const follow = (spec, node) => {
    if (spec.startsWith("@/")) {
      problems.push(`${at(node)}: runtime import "${spec}" uses the @/ alias; use a relative path with its extension`);
      return;
    }
    if (!spec.startsWith(".")) return; // a package: node resolves it
    if (!/\.(ts|json|mjs|js)$/.test(spec)) {
      problems.push(`${at(node)}: relative import "${spec}" has no extension; node needs "${spec}.ts"`);
      return;
    }
    if (spec.endsWith(".ts")) visits.push(visit(resolve(dirname(file), spec), file));
  };
  const walk = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const typeOnly = ts.isImportDeclaration(node) ? !!node.importClause?.isTypeOnly : !!node.isTypeOnly;
      if (!typeOnly) follow(node.moduleSpecifier.text, node);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
      follow(node.arguments[0].text, node);
    } else if (ts.isEnumDeclaration(node)) problems.push(`${at(node)}: enum; strip-only mode cannot run it`);
    else if (ts.isModuleDeclaration(node) && !(node.flags & ts.NodeFlags.GlobalAugmentation)) problems.push(`${at(node)}: namespace; strip-only mode cannot run it`);
    else if (
      ts.isConstructorDeclaration(node) &&
      node.parameters.some((p) => p.modifiers?.some((m) => [ts.SyntaxKind.PublicKeyword, ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword, ts.SyntaxKind.ReadonlyKeyword].includes(m.kind)))
    )
      problems.push(`${at(node)}: constructor parameter property; strip-only mode cannot run it`);
    ts.forEachChild(node, walk);
  };
  walk(src);
}

const visits = [];
for await (const t of tests(join(root, "src"))) visits.push(visit(t, t));
// Imports found while visiting push more visits; drain until none are left.
for (let i = 0; i < visits.length; i++) await visits[i];

if (problems.length) {
  console.error(`modules the unit tests load must run in node as they are (AGENTS.md › Node-run modules):\n\n  ${problems.join("\n  ")}\n`);
  process.exit(1);
}
console.log(`check-node-imports: ${seen.size} modules load in node`);
