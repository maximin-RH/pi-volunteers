// Shared by client forms (checks before upload) and server pages (URLs). No server-only imports here.

export const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const IMAGE_ACCEPT = Object.keys(IMAGE_TYPES).join(",");
export const MAX_IMAGE_MB = 5;

/** Error message for an unsuitable image, or null if it's fine. */
export function imageProblem(file: File): string | null {
  if (!IMAGE_TYPES[file.type]) return "Use a JPG, PNG or WebP image.";
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) return `Images must be ${MAX_IMAGE_MB} MB or smaller.`;
  return null;
}

export function publicImage(bucket: "role-images" | "org-logos", path: string) {
  return process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/" + bucket + "/" + path;
}

/** The role's own photo, else the organisation's logo (shown whole, not cropped), else an Island photo. */
export function roleImage(o: { image_path: string | null; org_logo: string | null }) {
  if (o.image_path) return { src: publicImage("role-images", o.image_path), isLogo: false };
  if (o.org_logo) return { src: publicImage("org-logos", o.org_logo), isLogo: true };
  return { src: "/images/coast.jpg", isLogo: false };
}
