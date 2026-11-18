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
