export type AdminActionLogInput = {
  actorUserId: number;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: unknown;
};
