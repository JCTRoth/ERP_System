/**
 * Normalize a UUID string to the standard 8-4-4-4-12 format with dashes.
 * The .NET UserService returns UUIDs without dashes (e.g. "00000000000000000000000000000001"),
 * but the Java company service expects the dashed format (e.g. "00000000-0000-0000-0000-000000000001").
 */
export function normalizeUuid(id: string): string {
  const hex = id.replace(/-/g, '');
  if (hex.length !== 32) return id;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Compare two UUID strings for equality, ignoring dash formatting.
 */
export function uuidsEqual(a: string, b: string): boolean {
  return a.replace(/-/g, '').toLowerCase() === b.replace(/-/g, '').toLowerCase();
}
