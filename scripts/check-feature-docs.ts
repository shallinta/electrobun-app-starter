const FEATURE_MARKER_CANDIDATE = /<!--\s*feature\b[\s\S]*?-->/g;
const VALID_FEATURE_MARKER =
  /^<!--\s*feature:\s*([a-z0-9]+(?:-[a-z0-9]+)*)\s*-->$/;

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

interface FeatureMarker {
  id: string;
  index: number;
  length: number;
}

function _escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function _parseCatalog(
  content: string,
  catalogName: CatalogName
): FeatureEntry[] {
  const markers: FeatureMarker[] = [
    ...content.matchAll(FEATURE_MARKER_CANDIDATE),
  ].map((candidate) => {
    const validMarker = VALID_FEATURE_MARKER.exec(candidate[0]);

    if (!validMarker) {
      throw new Error(
        `${catalogName} feature catalog contains an invalid feature marker`
      );
    }

    return {
      id: validMarker[1]!,
      index: candidate.index ?? 0,
      length: candidate[0].length,
    };
  });

  if (markers.length === 0) {
    throw new Error(`${catalogName} feature catalog has no feature entries`);
  }

  return markers.map((marker, index) => {
    const bodyStart = marker.index + marker.length;
    const bodyEnd = markers[index + 1]?.index ?? content.length;

    return {
      id: marker.id,
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
      const fieldPrefix = `^\\s*-\\s+\\*\\*${_escapeRegExp(label)}\\*\\*`;
      const fieldLinePattern = new RegExp(`${fieldPrefix}[^\\r\\n]*$`, "gm");
      const fieldCount = entry.body.match(fieldLinePattern)?.length ?? 0;

      if (fieldCount === 0) {
        throw new Error(
          `${catalogName} feature "${entry.id}" is missing required label "${label}"`
        );
      }
      if (fieldCount !== 1) {
        throw new Error(
          `${catalogName} feature "${entry.id}" must contain required label "${label}" exactly once (found ${fieldCount})`
        );
      }

      const populatedFieldPattern = new RegExp(
        `${fieldPrefix}[ \\t]*\\S[^\\r\\n]*$`,
        "gm"
      );
      if (!populatedFieldPattern.test(entry.body)) {
        throw new Error(
          `${catalogName} feature "${entry.id}" has an empty required label "${label}"`
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
      Bun.file(new URL("../docs/FEATURES.md", import.meta.url)).text(),
      Bun.file(new URL("../docs/FEATURES_EN.md", import.meta.url)).text(),
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
