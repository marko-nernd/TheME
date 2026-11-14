export const paidProfileRoles = new Set(["photographer", "host", "promoter", "organizer"]);
export const freeMembershipTiers = new Set(["", "none", "profile", "basic", "free"]);

export function tierGrantsPaidAccess(tier: string | null | undefined, subscriptionExempt = false, activeSubscriptions = 0) {
  return subscriptionExempt || !freeMembershipTiers.has(tier ?? "") || activeSubscriptions > 0;
}

export function canAccessFullModelProfile(input: {
  viewerRole?: string | null;
  viewerId?: string | null;
  ownerId?: string | null;
  isAdmin?: boolean;
  hasPaidAccess?: boolean;
}) {
  return Boolean(
    input.isAdmin ||
    (input.viewerId && input.viewerId === input.ownerId) ||
    (input.viewerRole && paidProfileRoles.has(input.viewerRole) && input.hasPaidAccess),
  );
}
