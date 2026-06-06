import { TRPCError } from "@trpc/server";

export type HeartbeatJob = {
  name: string;
  /**
   * 6-field cron with seconds (`sec min hour dom mon dow`), UTC, min interval 60s.
   * Use `0` for the seconds field — e.g. `"0 0 9 * * *"` is daily 09:00 UTC.
   * See periodic-updates.md.
   */
  cron: string;
  /** Callback path. MUST start with `/api/scheduled/`. */
  path: string;
  method?: "POST" | "PUT";
  payload?: unknown;
  description?: string;
};

/**
 * Update patch. All fields optional; unset = leave unchanged.
 * `enable`: true = resume, false = pause; omit = unchanged.
 * `name` is the (project, owner)-scope key and cannot be changed.
 */
export type HeartbeatJobUpdate = Partial<Omit<HeartbeatJob, "name">> & {
  enable?: boolean;
};

export type HeartbeatJobInfo = {
  taskUid: string;
  name: string;
  userId: string;
  description: string;
  cronExpression: string;
  callbackPath: string;
  callbackMethod: string;
  callbackPayload: string;
  isEnable: boolean;
  createdAt?: string | null;
  lastExecutedAt?: string | null;
  nextExecutionAt?: string | null;
};

const heartbeatUnavailable = (): never => {
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Heartbeat jobs are not available in the desktop build.",
  });
};

const stringifyPayload = (payload: unknown): string => {
  if (payload === undefined || payload === null) return "{}";
  if (typeof payload === "string") return payload;
  return JSON.stringify(payload);
};

const validateCallbackPath = (path: string): void => {
  if (!path || !path.startsWith("/api/scheduled/")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "callback path must start with /api/scheduled/",
    });
  }
};

/**
 * Create a new HTTP cron job. Returns the assigned `taskUid` to persist on
 * your business row so callbacks can dereference it.
 */
export async function createHeartbeatJob(
  job: HeartbeatJob,
  userSession: string
): Promise<{ taskUid: string; nextExecutionAt?: string | null }> {
  validateCallbackPath(job.path);
  stringifyPayload(job.payload);
  void userSession;
  return heartbeatUnavailable();
}

/**
 * Update an existing cron located by `taskUid`. Only fields you pass in
 * `patch` are mutated. `enable` flips resume/pause; omit to leave alone.
 */
export async function updateHeartbeatJob(
  taskUid: string,
  patch: HeartbeatJobUpdate,
  userSession: string
): Promise<{ nextExecutionAt?: string | null }> {
  if (patch.path !== undefined) validateCallbackPath(patch.path);
  if (patch.payload !== undefined) stringifyPayload(patch.payload);
  void taskUid;
  void userSession;
  return heartbeatUnavailable();
}

/** Delete a cron located by `taskUid`. Idempotent on caller side. */
export async function deleteHeartbeatJob(
  taskUid: string,
  userSession: string
): Promise<void> {
  void taskUid;
  void userSession;
  heartbeatUnavailable();
}

/**
 * List cron jobs owned by the resolved actor (end-user when `userSession`
 * is set, project owner otherwise) within the current project.
 *
 * `actorUserId` in the response echoes whose cron list you got back. End-users
 * cannot list other users' crons via this SDK; cross-user inspection is
 * owner-only via the sandbox CLI (`manus-heartbeat list --user-id <uid>`).
 */
export async function listHeartbeatJobs(
  userSession: string,
  pagination?: { page?: number; pageSize?: number }
): Promise<{ total: number; actorUserId: string; jobs: HeartbeatJobInfo[] }> {
  void userSession;
  void pagination;
  return heartbeatUnavailable();
}
