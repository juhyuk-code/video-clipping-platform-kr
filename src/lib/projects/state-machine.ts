import { ProjectStatus } from "@prisma/client";

// Valid status transitions for the project state machine
const VALID_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: ["OPEN", "CANCELLED"],
  OPEN: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["IN_REVIEW", "CANCELLED"],
  IN_REVIEW: ["REVISION_REQUESTED", "COMPLETED", "DISPUTED"],
  REVISION_REQUESTED: ["IN_PROGRESS", "CANCELLED", "DISPUTED"],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: ["COMPLETED", "CANCELLED"],
};

export function canTransition(
  from: ProjectStatus,
  to: ProjectStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidTransitions(status: ProjectStatus): ProjectStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}
