export type ProposalLifecycle = "submitted" | "reviewing" | "approved" | "rejected" | "declined" | "deleted";
export type ParticipationLifecycle = "pending" | "approved" | "awaiting_payment" | "confirmed" | "declined" | "cancelled" | "refunded";

const proposalTransitions: Record<ProposalLifecycle, ProposalLifecycle[]> = {
  submitted: ["reviewing", "approved", "rejected", "declined", "deleted"],
  reviewing: ["approved", "rejected", "declined", "deleted"],
  approved: ["deleted"],
  rejected: ["deleted"],
  declined: ["deleted"],
  deleted: [],
};

const participationTransitions: Record<ParticipationLifecycle, ParticipationLifecycle[]> = {
  pending: ["approved", "confirmed", "declined", "cancelled"],
  approved: ["awaiting_payment", "confirmed", "declined", "cancelled"],
  awaiting_payment: ["confirmed", "cancelled", "refunded"],
  confirmed: ["cancelled", "refunded"],
  declined: [],
  cancelled: ["refunded"],
  refunded: [],
};

export function canTransitionProposal(from: string, to: ProposalLifecycle) {
  return (proposalTransitions[from as ProposalLifecycle] ?? []).includes(to);
}

export function canTransitionParticipation(from: string, to: ParticipationLifecycle) {
  return (participationTransitions[from as ParticipationLifecycle] ?? []).includes(to);
}

export function assertTransition(kind: "proposal" | "participation", from: string, to: string) {
  const allowed = kind === "proposal"
    ? canTransitionProposal(from, to as ProposalLifecycle)
    : canTransitionParticipation(from, to as ParticipationLifecycle);
  if (!allowed) throw new Error(`Invalid ${kind} transition: ${from} → ${to}`);
}
