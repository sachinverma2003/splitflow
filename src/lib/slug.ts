export function generateSlug(name: string): string {
  const cleanName = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const randomPart = Math.random().toString(36).substring(2, 6);
  const baseSlug = cleanName || "group";
  return `${baseSlug}-${randomPart}`;
}
