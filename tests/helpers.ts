import { NextRequest } from "next/server";
import type { Types } from "mongoose";
import { Game, Staff, Team, type GameDoc, type TeamDoc } from "@/lib/server/models";
import { seedGame } from "@/lib/server/seed";
import { hashPin } from "@/lib/server/services/staff";
import { normalizeName } from "@/lib/shared/validation";
import * as staffLoginRoute from "@/app/api/staff/login/route";
import * as registerRoute from "@/app/api/player/register/route";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: any, ctx: any) => Promise<Response>;

export interface CallOptions {
  method?: string;
  path?: string;
  query?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string>;
  ip?: string;
  rawBody?: string;
  headers?: Record<string, string>;
}

export interface CallResult {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  headers: Headers;
  setCookies: Record<string, { value: string; maxAge?: number; httpOnly: boolean }>;
}

/**
 * A browser-like client: keeps cookies between calls and invokes the real Next.js
 * route handlers in-process (no HTTP server needed).
 */
export class Client {
  cookies: Record<string, string> = {};

  constructor(public ip = "10.0.0.1") {}

  async call(handler: Handler, opts: CallOptions = {}): Promise<CallResult> {
    const url = new URL(`http://test.local${opts.path ?? "/api/test"}`);
    for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v);
    const headers = new Headers({
      "content-type": "application/json",
      "x-forwarded-for": opts.ip ?? this.ip,
      "user-agent": "vitest",
    });
    const cookieHeader = Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    if (cookieHeader) headers.set("cookie", cookieHeader);
    for (const [k, v] of Object.entries(opts.headers ?? {})) headers.set(k, v);

    const method = opts.method ?? (opts.body !== undefined ? "POST" : "GET");
    const req = new NextRequest(url, {
      method,
      headers,
      body: opts.rawBody ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    });
    const res = await handler(req, { params: opts.params ?? {} });

    const setCookies: CallResult["setCookies"] = {};
    for (const raw of res.headers.getSetCookie()) {
      const [pair, ...attrs] = raw.split(";").map((s) => s.trim());
      const idx = pair.indexOf("=");
      const name = pair.slice(0, idx);
      const value = decodeURIComponent(pair.slice(idx + 1));
      const maxAgeAttr = attrs.find((a) => a.toLowerCase().startsWith("max-age="));
      const maxAge = maxAgeAttr ? Number(maxAgeAttr.split("=")[1]) : undefined;
      setCookies[name] = { value, maxAge, httpOnly: attrs.some((a) => a.toLowerCase() === "httponly") };
      if (maxAge === 0 || value === "") delete this.cookies[name];
      else this.cookies[name] = value;
    }

    const text = res.status === 204 || res.status === 304 ? "" : await res.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    return { status: res.status, body, headers: res.headers, setCookies };
  }
}

export const GM = { name: "Host One", pin: "111111" };

export async function setupGame(opts: { registrationOpen?: boolean; code?: string } = {}) {
  const { game } = await seedGame({
    code: opts.code ?? "TEST",
    name: "Test Game",
    activate: true,
    gmName: GM.name,
    gmPin: GM.pin,
  });
  if (opts.registrationOpen ?? true) {
    await Game.updateOne({ _id: game._id }, { $set: { registrationOpen: true, phase: "LOBBY" } });
  }
  const teams = await Team.find({ gameId: game._id }).sort({ order: 1 }).lean<TeamDoc[]>();
  const byKey = Object.fromEntries(teams.map((t) => [t.key, t])) as Record<string, TeamDoc>;
  return { game: (await Game.findById(game._id).lean())!, teams, byKey };
}

export async function createStaffMember(name: string, pin: string, role: "GM" | "TM", teamIds: Types.ObjectId[] = []) {
  return Staff.create({ name, nameNormalized: normalizeName(name), role, teamIds, pinHash: await hashPin(pin) });
}

export async function loginStaff(name: string, pin: string, ip?: string) {
  const c = new Client(ip);
  const r = await c.call(staffLoginRoute.POST, { body: { name, pin } });
  if (r.status !== 200) throw new Error(`login failed: ${r.status} ${JSON.stringify(r.body)}`);
  return c;
}

let phoneCounter = 0;
/** Generates distinct valid Sri Lankan mobile numbers. */
export function nextPhone() {
  phoneCounter += 1;
  return `077${String(1000000 + phoneCounter).slice(-7)}`;
}

export async function registerPlayer(teamId: Types.ObjectId | string, name = "Test Player", phone = nextPhone()) {
  const c = new Client();
  const r = await c.call(registerRoute.POST, { body: { name, phone, teamId: String(teamId) } });
  return { client: c, res: r, phone };
}

/**
 * A game in PLAYING: teams filled, roles revealed, GM logged in.
 * `players` lists every registered player with their client, id, team key and (secret) role.
 */
export async function startGame(perTeam: Record<string, number> = { red: 4, blue: 4 }) {
  const ctx = await setupGame();
  const clients = await fillTeams(ctx.byKey, perTeam);
  const gm = await loginStaff(GM.name, GM.pin);
  const { POST: revealPOST } = await import("@/app/api/gm/roles/reveal/route");
  const r = await gm.call(revealPOST, { body: { confirm: "REVEAL" } });
  if (r.status !== 200) throw new Error(`reveal failed: ${r.status}`);
  const { GET: stateGET } = await import("@/app/api/player/state/route");
  const players: { client: Client; id: string; name: string; team: string; role: string }[] = [];
  for (const [team, cs] of Object.entries(clients)) {
    for (const c of cs) {
      const me = (await c.call(stateGET)).body.me;
      players.push({ client: c, id: me.id, name: me.name, team, role: me.role });
    }
  }
  const game = (await Game.findById(ctx.game._id).lean<GameDoc>())!;
  return { ...ctx, game, gm, players, byRole: (role: string, team?: string) => players.filter((p) => p.role === role && (!team || p.team === team)) };
}

/** Registers `n` players per team key, e.g. { red: 5, blue: 4 }. Returns their clients. */
export async function fillTeams(byKey: Record<string, { _id: Types.ObjectId }>, perTeam: Record<string, number>) {
  const clients: Record<string, Client[]> = {};
  for (const [key, n] of Object.entries(perTeam)) {
    clients[key] = [];
    for (let i = 0; i < n; i++) {
      const name = `${key} Player ${String.fromCharCode(65 + i)}`;
      clients[key].push((await registerPlayer(byKey[key]._id, name)).client);
    }
  }
  return clients;
}

