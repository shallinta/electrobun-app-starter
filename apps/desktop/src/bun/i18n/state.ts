import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { SupportedLocale } from "../../shared/i18n";
import { isSupportedLocale, resolveSupportedLocale } from "../../shared/i18n";

export interface LocaleStateStore {
  getLocale(): Promise<SupportedLocale>;
  setLocale(locale: SupportedLocale): Promise<void>;
}

export function createLocaleStateStore(
  settingsDir: string,
  getSystemLocale: () => string | undefined
): LocaleStateStore {
  const statePath = join(settingsDir, "locale.json");
  let mutationQueue: Promise<void> = Promise.resolve();

  const fallback = (): SupportedLocale =>
    resolveSupportedLocale(getSystemLocale());

  const write = async (locale: SupportedLocale): Promise<void> => {
    const temporaryPath = `${statePath}.${process.pid}.${randomUUID()}.tmp`;
    await mkdir(settingsDir, { recursive: true });
    try {
      await writeFile(
        temporaryPath,
        `${JSON.stringify({ locale }, null, 2)}\n`,
        "utf8"
      );
      await rename(temporaryPath, statePath);
    } catch (error) {
      await rm(temporaryPath, { force: true });
      throw error;
    }
  };

  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const queued = mutationQueue.then(operation);
    mutationQueue = queued.then(
      () => undefined,
      () => undefined
    );
    return queued;
  };

  const load = (): Promise<SupportedLocale> =>
    enqueue(async () => {
      let locale: unknown;
      try {
        const state = JSON.parse(await readFile(statePath, "utf8")) as unknown;
        locale =
          typeof state === "object" && state !== null && !Array.isArray(state)
            ? (state as { locale?: unknown }).locale
            : undefined;
      } catch (error) {
        if (
          !(error instanceof SyntaxError) &&
          (error as NodeJS.ErrnoException).code !== "ENOENT"
        ) {
          throw error;
        }
      }
      if (isSupportedLocale(locale)) return locale;
      const initialLocale = fallback();
      await write(initialLocale);
      return initialLocale;
    });

  return {
    getLocale: load,
    setLocale: (locale) => enqueue(() => write(locale)),
  };
}
