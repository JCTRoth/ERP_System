/**
 * Translation Reference Resolver
 * 
 * Resolves $t{key.name} references in strings using the i18n translation function.
 * Used by ComponentRenderer and PreviewModal to display translated content.
 * 
 * Syntax: $t{namespace.keyName}
 * Example: $t{nav.dashboard} → "Dashboard"
 */

const TRANSLATION_REF_REGEX = /\$t\{([^}]+)\}/g;

/**
 * Check if a string contains any $t{} references.
 */
export function hasTranslationRefs(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return TRANSLATION_REF_REGEX.test(value);
}

/**
 * Resolve all $t{key} references in a string.
 * @param value - The string potentially containing $t{key} references
 * @param t - The translation function from useI18n()
 * @returns The string with all $t{key} references replaced with translated text
 */
export function resolveTranslationRefs(
  value: string,
  t: (key: string) => string
): string {
  // Reset regex lastIndex since it's global
  TRANSLATION_REF_REGEX.lastIndex = 0;
  return value.replace(TRANSLATION_REF_REGEX, (_match, key: string) => {
    const trimmedKey = key.trim();
    const translated = t(trimmedKey);
    // If t() returns the key itself (not found), keep the $t{} syntax for visibility
    if (translated === trimmedKey || translated === trimmedKey.replace(/\./g, ' ')) {
      return `[${trimmedKey}]`;
    }
    return translated;
  });
}

/**
 * Resolve a single prop value that might contain $t{} references.
 * Returns the original value if it's not a string or has no refs.
 */
export function resolveTranslationProp(
  value: unknown,
  t: (key: string) => string
): unknown {
  if (typeof value !== 'string') return value;
  // Reset regex lastIndex
  TRANSLATION_REF_REGEX.lastIndex = 0;
  if (!TRANSLATION_REF_REGEX.test(value)) return value;
  // Reset again after test
  TRANSLATION_REF_REGEX.lastIndex = 0;
  return resolveTranslationRefs(value, t);
}
