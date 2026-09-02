const PREFIX =
  "appoponi:offline:v1:";

type CachedValue<T> = {
  saved_at: string;
  value: T;
};

function storageKey(key: string) {
  return `${PREFIX}${key}`;
}

export function saveOfflineCache<T>(
  key: string,
  value: T,
) {
  try {
    const cached: CachedValue<T> = {
      saved_at: new Date().toISOString(),
      value,
    };

    localStorage.setItem(
      storageKey(key),
      JSON.stringify(cached),
    );
  } catch {
    // Cache failures must not break the app.
  }
}

export function readOfflineCache<T>(
  key: string,
): CachedValue<T> | null {
  try {
    const raw =
      localStorage.getItem(
        storageKey(key),
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw) as CachedValue<T>;

    if (
      !parsed ||
      typeof parsed.saved_at !==
        "string" ||
      !("value" in parsed)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function removeOfflineCache(
  key: string,
) {
  try {
    localStorage.removeItem(
      storageKey(key),
    );
  } catch {
    // Ignore cleanup failures.
  }
}

export function isOfflineFetchFailure(
  error: unknown,
) {
  return (
    !navigator.onLine ||
    error instanceof TypeError
  );
}
