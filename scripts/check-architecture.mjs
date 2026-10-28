import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const SOURCE_ROOT = path.join(ROOT, "src");
const DEFAULT_TYPESCRIPT_BUDGET = 650;
const DEFAULT_STYLESHEET_BUDGET = 800;

// These are shrinking ceilings for known aggregation points, not targets.
// Lower a ceiling after an extraction; do not raise one to land a feature.
const FILE_BUDGETS = new Map([
  ["src/game/engine.ts", 848],
  ["src/ui/render.ts", 100],
  ["src/game/anatomy.ts", 100],
  ["src/game/enemy-actions.ts", 100],
  ["src/game/content.ts", 100],
  ["src/game/persistence.ts", 200],
  ["src/game/types.ts", 900],
  ["src/ui/inventory-render.ts", 150],
  ["src/styles.css", 50],
  ["src/ui/app.ts", 647],
  ["src/styles/inventory.css", 20],
]);

const EAGER_PRESENTATION_CONTRACTS = [
  {
    name: "compact dossier knowledge links",
    markupFile: "src/ui/knowledge-disclosure.ts",
    markupToken: 'class="compact-knowledge-link"',
    selector: ".compact-knowledge-link",
  },
];

const OPTIONAL_PRESENTATION_CONTRACTS = [
  {
    name: "Inventory",
    stylesheetFacade: "src/styles/inventory-surface.css",
    styleLoaderToken: 'import("../styles/inventory-surface.css")',
    screenLoaderFile: "src/ui/optional-screen-loader.ts",
    screenLoaderToken: "ensureInventorySurfaceStyles()",
  },
  {
    name: "Journal",
    stylesheetFacade: "src/styles/journal-surface.css",
    styleLoaderToken: 'import("../styles/journal-surface.css")',
    screenLoaderFile: "src/ui/optional-screen-loader.ts",
    screenLoaderToken: "ensureJournalSurfaceStyles()",
  },
  {
    name: "Stats",
    stylesheetFacade: "src/styles/stats-surface.css",
    styleLoaderToken: 'import("../styles/stats-surface.css")',
    screenLoaderFile: "src/ui/stats-surface-loader.ts",
    screenLoaderToken: "ensureStatsSurfaceStyles()",
  },
];

const normalize = (filePath) => filePath.split(path.sep).join("/");

const collectFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolute = path.join(directory, entry.name);
      return entry.isDirectory() ? collectFiles(absolute) : [absolute];
    }),
  );
  return nested.flat();
};

const lineCount = (source) => {
  if (source.length === 0) return 0;
  return source.split(/\r?\n/u).length;
};

const sourceFiles = (await collectFiles(SOURCE_ROOT)).filter(
  (filePath) =>
    (filePath.endsWith(".ts") || filePath.endsWith(".css")) &&
    !filePath.endsWith(".test.ts"),
);

const collectImportedStyles = async (relative, visited = new Set()) => {
  if (visited.has(relative)) return visited;
  visited.add(relative);
  const absolute = path.join(ROOT, relative);
  const source = await readFile(absolute, "utf8");
  const directory = path.dirname(relative);
  for (const match of source.matchAll(/@import\s+["']([^"']+)["']/gu)) {
    const imported = normalize(path.normalize(path.join(directory, match[1])));
    await collectImportedStyles(imported, visited);
  }
  return visited;
};

const eagerStyleFiles = await collectImportedStyles("src/styles.css");
const eagerStyleSource = (
  await Promise.all(
    [...eagerStyleFiles].map((relative) =>
      readFile(path.join(ROOT, relative), "utf8"),
    ),
  )
).join("\n");

const failures = [];
const boundaryFailures = [];

for (const contract of EAGER_PRESENTATION_CONTRACTS) {
  const markup = await readFile(path.join(ROOT, contract.markupFile), "utf8");
  if (!markup.includes(contract.markupToken)) {
    boundaryFailures.push(
      `${contract.name}: expected markup token is missing from ${contract.markupFile}`,
    );
  }
  if (!eagerStyleSource.includes(contract.selector)) {
    boundaryFailures.push(
      `${contract.name}: ${contract.selector} must be delivered by the eager src/styles.css import graph`,
    );
  }
}

const optionalStyleLoader = await readFile(
  path.join(ROOT, "src/ui/optional-surface-styles.ts"),
  "utf8",
);
for (const contract of OPTIONAL_PRESENTATION_CONTRACTS) {
  if (eagerStyleFiles.has(contract.stylesheetFacade)) {
    boundaryFailures.push(
      `${contract.name}: ${contract.stylesheetFacade} must remain outside the eager src/styles.css import graph`,
    );
  }
  if (!optionalStyleLoader.includes(contract.styleLoaderToken)) {
    boundaryFailures.push(
      `${contract.name}: optional-surface-styles.ts must dynamically load ${contract.stylesheetFacade}`,
    );
  }
  const screenLoader = await readFile(
    path.join(ROOT, contract.screenLoaderFile),
    "utf8",
  );
  if (!screenLoader.includes(contract.screenLoaderToken)) {
    boundaryFailures.push(
      `${contract.name}: ${contract.screenLoaderFile} must await its screen-specific stylesheet before rendering`,
    );
  }
}

const chronicleStylesheet = "src/styles/chronicle.css";
const chronicleSurface = await readFile(
  path.join(ROOT, "src/ui/chronicle-surface.ts"),
  "utf8",
);
const bootstrapController = await readFile(
  path.join(ROOT, "src/ui/bootstrap.ts"),
  "utf8",
);
if (eagerStyleFiles.has(chronicleStylesheet)) {
  boundaryFailures.push(
    `Chronicle: ${chronicleStylesheet} must remain outside the eager src/styles.css import graph`,
  );
}
if (!chronicleSurface.includes('import "../styles/chronicle.css"')) {
  boundaryFailures.push(
    "Chronicle: its lazy surface must own the Chronicle stylesheet",
  );
}
if (!bootstrapController.includes('import("./chronicle-surface")')) {
  boundaryFailures.push(
    "Chronicle: the title bootstrap must load the surface only after an explicit open action",
  );
}

const shellRenderer = await readFile(
  path.join(ROOT, "src/ui/shell-render.ts"),
  "utf8",
);
if (!shellRenderer.includes('from "../game/journal-count"')) {
  boundaryFailures.push(
    "Journal: shell-render.ts must consume the compact Journal count selector",
  );
}

const journalCountSelector = await readFile(
  path.join(ROOT, "src/game/journal-count.ts"),
  "utf8",
);
const journalVisibility = await readFile(
  path.join(ROOT, "src/game/world/journal-visibility.ts"),
  "utf8",
);
for (const [relative, source] of [
  ["src/game/journal-count.ts", journalCountSelector],
  ["src/game/world/journal-visibility.ts", journalVisibility],
]) {
  if (
    /(?:world\/(?:actors|facts|read-model)|\.\/journal["'])/u.test(
      source,
    )
  ) {
    boundaryFailures.push(
      `${relative}: eager Journal counting cannot import authored Journal or world presentation catalogs`,
    );
  }
}

for (const absolute of sourceFiles) {
  const relative = normalize(path.relative(ROOT, absolute));
  const source = await readFile(absolute, "utf8");
  const lines = lineCount(source);
  const budget =
    FILE_BUDGETS.get(relative) ??
    (relative.endsWith(".css")
      ? DEFAULT_STYLESHEET_BUDGET
      : DEFAULT_TYPESCRIPT_BUDGET);

  if (lines > budget) {
    failures.push({ relative, lines, budget });
  }

  const imports = [
    ...source.matchAll(
      /(?:from\s+|import\s*\()\s*["']([^"']+)["']/gu,
    ),
  ].map((match) => match[1]);
  if (
    relative.startsWith("src/game/") &&
    imports.some((specifier) => specifier.includes("/ui/"))
  ) {
    boundaryFailures.push(
      `${relative}: game modules cannot import UI modules`,
    );
  }
  if (
    relative.startsWith("src/ui/") &&
    ![
      "src/ui/app.ts",
      "src/ui/bootstrap.ts",
      "src/ui/bootstrap-development-action.ts",
    ].includes(relative) &&
    imports.some(
      (specifier) =>
        specifier === "./app" || specifier.endsWith("/ui/app"),
    )
  ) {
    boundaryFailures.push(
      `${relative}: non-controller UI modules cannot import app.ts`,
    );
  }
}

if (failures.length > 0 || boundaryFailures.length > 0) {
  if (boundaryFailures.length > 0) {
    console.error("Architecture dependency boundaries exceeded:");
    for (const failure of boundaryFailures) {
      console.error(`  ${failure}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Architecture size budgets exceeded:");
  for (const failure of failures) {
    console.error(
      `  ${failure.relative}: ${failure.lines} lines (budget ${failure.budget})`,
    );
  }
  console.error(
    "Extract a cohesive domain or screen module. Do not raise a budget to land a feature.",
  );
}

if (failures.length > 0 || boundaryFailures.length > 0) {
  process.exitCode = 1;
} else {
  console.log(
    `Architecture budgets passed for ${sourceFiles.length} implementation files.`,
  );
}
