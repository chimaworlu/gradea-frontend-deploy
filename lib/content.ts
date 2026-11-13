import placeholder from "../content/marketing/placeholder.json";

/** Every content file starts with an id and a title that match the screen list. */
export type ContentFileHeader = { id: string; title: string };

// Every content file is registered here. Its type is inferred from the JSON itself, so a
// missing or misspelled key is a type error at build time (content-and-copy rule, Section 1).
const contentFiles = {
  "marketing/placeholder": placeholder,
} satisfies Record<string, ContentFileHeader>;

export type ContentFileKey = keyof typeof contentFiles;
export type ContentFile<K extends ContentFileKey> = (typeof contentFiles)[K];

/** Returns the typed text for one screen, for example getContent("marketing/placeholder"). */
export function getContent<K extends ContentFileKey>(key: K): ContentFile<K> {
  return contentFiles[key];
}

/** Every registered content file with its key, for checks and tests. */
export function listContentFiles(): Array<[ContentFileKey, ContentFileHeader]> {
  return Object.entries(contentFiles).map(([key, file]) => {
    if (!isContentFileKey(key)) {
      throw new Error(`Unknown content file key: ${key}`);
    }
    return [key, file];
  });
}

function isContentFileKey(key: string): key is ContentFileKey {
  return Object.hasOwn(contentFiles, key);
}

export type PlaceholderValues = Record<string, string | number>;

/**
 * Fills placeholders such as {price} or {date} in a content string.
 * Throws if the text names a placeholder with no value, so a half-filled sentence is never shown.
 */
export function fillPlaceholders(template: string, values: PlaceholderValues): string {
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (_match, name: string) => {
    const value = values[name];
    if (value === undefined) {
      throw new Error(`Missing value for placeholder {${name}}.`);
    }
    return String(value);
  });
}
