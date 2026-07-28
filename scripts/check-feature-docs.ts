const FEATURE_MARKER = /<!--\s*feature:\s*([a-z0-9][a-z0-9-]*)\s*-->/g;

const CHINESE_LABELS = [
  "功能：",
  "使用场景：",
  "外壳状态：",
  "接入方式：",
  "代码位置：",
] as const;

const ENGLISH_LABELS = [
  "Capability:",
  "Use cases:",
  "Shell status:",
  "How to connect:",
  "Code locations:",
] as const;

type CatalogName = "Chinese" | "English";

interface FeatureEntry {
  id: string;
  body: string;
}

function _parseCatalog(
  content: string,
  catalogName: CatalogName
): FeatureEntry[] {
  const matches = [...content.matchAll(FEATURE_MARKER)];

  if (matches.length === 0) {
    throw new Error(`${catalogName} feature catalog has no feature entries`);
  }

  return matches.map((match, index) => {
    const bodyStart = (match.index ?? 0) + match[0].length;
    const bodyEnd = matches[index + 1]?.index ?? content.length;

    return {
      id: match[1]!,
      body: content.slice(bodyStart, bodyEnd),
    };
  });
}

function _verifyCatalog(
  entries: FeatureEntry[],
  catalogName: CatalogName,
  labels: readonly string[]
): void {
  const seen = new Set<string>();

  for (const entry of entries) {
    if (seen.has(entry.id)) {
      throw new Error(
        `${catalogName} feature catalog repeats feature ID "${entry.id}"`
      );
    }
    seen.add(entry.id);

    for (const label of labels) {
      if (!entry.body.includes(label)) {
        throw new Error(
          `${catalogName} feature "${entry.id}" is missing required label "${label}"`
        );
      }
    }
  }
}

export function verifyFeatureDocs(chinese: string, english: string): void {
  const chineseEntries = _parseCatalog(chinese, "Chinese");
  const englishEntries = _parseCatalog(english, "English");

  _verifyCatalog(chineseEntries, "Chinese", CHINESE_LABELS);
  _verifyCatalog(englishEntries, "English", ENGLISH_LABELS);

  const chineseIds = chineseEntries.map(({ id }) => id);
  const englishIds = englishEntries.map(({ id }) => id);

  if (
    chineseIds.length !== englishIds.length ||
    chineseIds.some((id, index) => id !== englishIds[index])
  ) {
    throw new Error(
      `Feature IDs or order differ: Chinese [${chineseIds.join(", ")}], English [${englishIds.join(", ")}]`
    );
  }
}

async function _main(): Promise<void> {
  try {
    const [chinese, english] = await Promise.all([
      Bun.file("docs/FEATURES.md").text(),
      Bun.file("docs/FEATURES_EN.md").text(),
    ]);

    verifyFeatureDocs(chinese, english);
    console.info("Feature catalogs are synchronized.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Feature catalog check failed: ${message}`);
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await _main();
}
