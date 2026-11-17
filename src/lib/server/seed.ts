import { DEFAULT_TEAMS, TEAM_COLORS } from "@/lib/shared/constants";
import { normalizeName } from "@/lib/shared/validation";
import { Game, Staff, Team, syncAllIndexes } from "./models";
import { hashPin } from "./services/staff";

export interface SeedOptions {
  code: string;
  name: string;
  activate?: boolean;
  gmName?: string;
  gmPin?: string;
  teams?: { key: keyof typeof TEAM_COLORS; name: string }[];
}

/**
 * Idempotent: creates the game (and default teams) if missing, optionally makes it the
 * active game, and creates the bootstrap GM if no staff member has that name yet.
 */
export async function seedGame(opts: SeedOptions) {
  await syncAllIndexes();
  const code = opts.code.toUpperCase();

  let game = await Game.findOne({ code });
  if (!game) {
    game = await Game.create({ code, name: opts.name });
    const teams = opts.teams ?? DEFAULT_TEAMS;
    await Team.insertMany(
      teams.map((t, i) => ({ gameId: game!._id, key: t.key, name: t.name, colorHex: TEAM_COLORS[t.key], order: i + 1 })),
    );
  }

  if (opts.activate) {
    await Game.updateMany({ active: true, _id: { $ne: game._id } }, { $set: { active: false } });
    await Game.updateOne({ _id: game._id }, { $set: { active: true }, $inc: { version: 1 } });
  }

  let gm = null;
  if (opts.gmName && opts.gmPin) {
    if (!/^\d{6}$/.test(opts.gmPin)) throw new Error("GM PIN must be exactly 6 digits");
    const nameNormalized = normalizeName(opts.gmName);
    gm = await Staff.findOne({ nameNormalized });
    if (!gm) {
      gm = await Staff.create({ name: opts.gmName.trim(), nameNormalized, role: "GM", pinHash: await hashPin(opts.gmPin) });
    }
  }

  return { game: (await Game.findById(game._id).lean())!, gm };
}
