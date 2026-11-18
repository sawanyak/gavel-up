import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { TEAM_COLOR_KEYS } from "./constants";

/** Collapse whitespace and trim. */
export const cleanName = (s: string) => s.replace(/\s+/g, " ").trim();
export const normalizeName = (s: string) => cleanName(s).toLowerCase();

/** Returns E.164 (e.g. +94771234567) or null. Defaults to Sri Lanka for local numbers like 0771234567. */
export function normalizePhone(input: string): string | null {
  const p = parsePhoneNumberFromString(input.trim(), "LK");
  if (!p || !p.isValid()) return null;
  return p.number;
}

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id.");

export const nameSchema = z
  .string({ required_error: "Name is required." })
  .transform(cleanName)
  .pipe(
    z
      .string()
      .min(2, "Name must be at least 2 characters.")
      .max(40, "Name must be at most 40 characters.")
      .regex(/^[\p{L}\p{M} .'-]+$/u, "Name can only contain letters, spaces, . ' and -."),
  );

export const phoneSchema = z
  .string({ required_error: "Phone number is required." })
  .max(25)
  .transform((s, ctx) => {
    const p = normalizePhone(s);
    if (!p) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid phone number (e.g. 0771234567)." });
      return z.NEVER;
    }
    return p;
  });

export const pinSchema = z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits.");

export const registerSchema = z.object({
  gameCode: z.string().max(20).optional(),
  name: nameSchema,
  phone: phoneSchema,
  teamId: objectId,
});

export const recoverSchema = z.object({
  gameCode: z.string().max(20).optional(),
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, "The code is 6 digits."),
});

export const staffLoginSchema = z.object({
  name: z.string().min(1, "Name is required.").max(40).transform(normalizeName),
  pin: z.string().min(1, "PIN is required.").max(12),
});

export const registrationToggleSchema = z.object({ open: z.boolean() });

const teamKey = z.enum(TEAM_COLOR_KEYS as [string, ...string[]]);
export const teamCreateSchema = z.object({
  key: teamKey,
  name: z.string().transform(cleanName).pipe(z.string().min(1).max(20)),
  order: z.number().int().min(0).max(99).optional(),
});
export const teamUpdateSchema = teamCreateSchema.partial();

export const staffCreateSchema = z.object({
  name: nameSchema,
  role: z.enum(["GM", "TM"]),
  teamIds: z.array(objectId).max(10).default([]),
  pin: pinSchema,
});
export const staffUpdateSchema = z.object({
  name: nameSchema.optional(),
  role: z.enum(["GM", "TM"]).optional(),
  teamIds: z.array(objectId).max(10).optional(),
  pin: pinSchema.optional(),
  active: z.boolean().optional(),
});

export const playerUpdateSchema = z.object({
  name: nameSchema.optional(),
  teamId: objectId.optional(),
  force: z.boolean().optional(),
});
export const playerRemoveSchema = z.object({
  reason: z.string().transform(cleanName).pipe(z.string().min(3, "Give a reason.").max(120)),
});

export { objectId };

/* ───────── Phase 2: roles ───────── */

export const revealSchema = z.object({
  confirm: z.literal("REVEAL", { errorMap: () => ({ message: 'Type "REVEAL" to confirm.' }) }),
});

export const roleOverrideSchema = z.object({
  role: z.enum(["crewmate", "impostor", "detective"]),
  reason: z.string().transform(cleanName).pipe(z.string().min(3, "Give a reason.").max(120)),
});

export const assignRandomRoleSchema = z.object({
  role: z.enum(["impostor", "detective"]),
});

const smallCount = z.number().int().min(0).max(5);
export const roleConfigSchema = z
  .object({
    impostorsPerTeam: smallCount.optional(),
    detectivesPerTeam: smallCount.optional(),
    minTeamSizeForSpecialRoles: z.number().int().min(1).max(20).optional(),
    impostorsSeeEachOther: z.boolean().optional(),
    impostorOverrides: z.record(objectId, smallCount).optional(),
  })
  .strict();

/* ───────── Phase 3: game control ───────── */

const reasonSchema = z.string().transform(cleanName).pipe(z.string().min(3, "Give a reason.").max(120));
const optionalNote = z.string().transform(cleanName).pipe(z.string().max(120)).optional();

export const killSchema = z.object({ note: optionalNote });
export const reviveSchema = z.object({ reason: reasonSchema });
export const investigationSchema = z.object({ targetPlayerId: objectId });

export const TASK_KIND_VALUES = ["individual", "team", "paired", "activity"] as const;

const taskTitle = z.string().transform(cleanName).pipe(z.string().min(2, "Title is too short.").max(60, "Title is too long."));
const taskDescription = z.string().trim().max(300, "Description is too long.");
const taskPoints = z.number().int("Whole numbers only.").min(0).max(100, "At most 100 points.");

export const taskCreateSchema = z
  .object({
    title: taskTitle,
    description: taskDescription.default(""),
    kind: z.enum(TASK_KIND_VALUES),
    points: taskPoints.optional(),
    verification: z.enum(["none", "staff"]).default("none"),
    pairScope: z.enum(["same_team", "cross_team"]).optional(),
    allowGhosts: z.boolean().default(true),
    order: z.number().int().min(0).max(999).optional(),
  })
  .strict();

/** kind and pairScope can't change once a task is created (assignments depend on them). */
export const taskUpdateSchema = z
  .object({
    title: taskTitle.optional(),
    description: taskDescription.optional(),
    points: taskPoints.optional(),
    verification: z.enum(["none", "staff"]).optional(),
    allowGhosts: z.boolean().optional(),
    order: z.number().int().min(0).max(999).optional(),
  })
  .strict();

/** Who gets the task when it's revealed. Nothing = everyone (all players / all teams). */
export const taskRevealSchema = z
  .object({
    teamIds: z.array(objectId).max(20).optional(),
    playerIds: z.array(objectId).max(200).optional(),
  })
  .strict();

export const taskVerifySchema = z.object({
  approve: z.boolean(),
  reason: z.string().transform(cleanName).pipe(z.string().max(120)).optional(),
});

export const announcementCreateSchema = z
  .object({
    text: z.string().trim().min(1, "Write something.").max(280, "At most 280 characters."),
    level: z.enum(["info", "alert"]).default("info"),
    teamId: objectId.nullable().optional(),
    pinned: z.boolean().default(false),
  })
  .strict();

/* ───────── Phase 4: meetings and voting ───────── */

export const callMeetingSchema = z.object({ override: z.boolean().optional() });
export const openVotingSchema = z.object({ durationSec: z.number().int().min(30, "At least 30 seconds.").max(900, "At most 15 minutes.").optional() });
export const reopenVotingSchema = z.object({ extraSec: z.number().int().min(10).max(600) });
export const decideSchema = z.object({ teamId: objectId, eliminatePlayerId: objectId.nullable() });
export const confirmMeetingSchema = z.object({
  confirm: z.literal("CONFIRM", { errorMap: () => ({ message: 'Type "CONFIRM" to confirm.' }) }),
});
export const cancelMeetingSchema = z.object({ reason: reasonSchema });
export const invalidateSchema = z.object({ reason: reasonSchema });
export const voteSchema = z.object({ meetingId: objectId, targetId: objectId.nullable() });
export const predictionSchema = z.object({ meetingId: objectId, targetTeamId: objectId, targetPlayerId: objectId });

/* ───────── Phase 5: scoring ───────── */

export const manualAwardSchema = z
  .object({
    teamId: objectId,
    amount: z
      .number()
      .int("Whole numbers only.")
      .min(-1000)
      .max(1000)
      .refine((n) => n !== 0, "The amount can't be 0."),
    reason: reasonSchema,
    activityTaskId: objectId.optional(),
    earnedByPlayerId: objectId.optional(),
  })
  .strict();

/** Client-generated per form submit (plan §9.1); retries reuse it. */
export const idempotencyKeySchema = z
  .string({ required_error: "Missing Idempotency-Key header." })
  .regex(/^[A-Za-z0-9-]{8,64}$/, "Invalid Idempotency-Key header.");

export const reverseSchema = z.object({ reason: reasonSchema });

export const ledgerQuerySchema = z.object({
  teamId: objectId.optional(),
  category: z.enum(["task", "activity", "manual", "internal_vote", "prediction", "penalty", "reversal"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

/* ───────── Phase 6: final reveal, projector, export, audit ───────── */

export const finalStartSchema = z.object({
  confirm: z.literal("FINAL", { errorMap: () => ({ message: 'Type "FINAL" to confirm.' }) }),
});
export const finalCompleteSchema = z.object({
  confirm: z.literal("FINISH", { errorMap: () => ({ message: 'Type "FINISH" to confirm.' }) }),
});
export const announceWinnerSchema = z.object({ winningTeamIds: z.array(objectId).min(1).max(10).optional() });
export const displaySchema = z.object({
  screen: z.enum(["LOBBY", "REGISTRATION", "RULES", "MEETING", "VOTING", "RESULTS", "FINAL", "IMPOSTORS", "LEADERBOARD", "WINNER", "STATS"]),
});
export const auditQuerySchema = z.object({
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  action: z.string().regex(/^[A-Z_]{2,40}$/).optional(),
});
export const exportQuerySchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
  table: z.enum(["players", "transactions"]).default("players"),
  includePhones: z.enum(["0", "1"]).default("0"),
});
