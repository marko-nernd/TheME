export const memberPlaceholderByRole = {
  model: "/images/placeholders/model_placeholder.png",
  photographer: "/images/placeholders/photographer_placeholder.png",
  host: "/images/placeholders/host-silhouette.png",
  sponsor: "/images/placeholders/sponsor-silhouette.png",
} as const;

export function memberPlaceholder(role: string | null | undefined) {
  if (role === "organizer" || role === "promoter") {
    return memberPlaceholderByRole.host;
  }

  return memberPlaceholderByRole[role as keyof typeof memberPlaceholderByRole]
    ?? memberPlaceholderByRole.model;
}
