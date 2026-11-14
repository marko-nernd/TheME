export const cameraBrands = ["Canon", "Nikon", "Sony", "Fujifilm", "Leica", "Pentax", "Hasselblad", "Other"] as const;

export function photographerPlaceholder(_cameraBrand: string | null | undefined) {
  return "/images/placeholders/photographer_placeholder.png";
}
