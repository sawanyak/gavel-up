/**
 * Load test (plan §14.4). Simulates event-day traffic against a running server:
 *   - a registration burst of N players
 *   - everyone polling their state every 3 s (1.5 s during voting), with ?v= like real phones
 *   - the GM dashboard and the projector polling
 *   - an emergency meeting with every player voting within ~20 s, plus duplicate-vote retries
 *
 * Pass criteria: p95 < 800 ms, zero 5xx, no duplicate votes.
 *
 * ONLY run it against a throw-away game, because it creates fake players:
 *   npm run seed -- --code LOADTEST --name "Load test" --activate
 *   npm run load-test -- --url http://localhost:3000 --gm-name "Host One" --gm-pin 123456 --yes
 * Then switch back:  npm run seed -- --code GAVELUP26 --activate
 *
 * Options: --players 100  --idle 30 (seconds of normal polling)  --voting 40 (seconds of voting)
 * Locally, start the server with DISABLE_RATE_LIMIT=1 (all fake players share your IP).
 * On a deployed site the script waits and retries when rate-limited.
 */

const arg = (name: string, def?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
};

const BASE = (arg("url", "http://localhost:3000") as string).replace(/\/$/, "");
const PLAYERS = Number(arg("players", "100"));
const IDLE_SEC = Number(arg("idle", "30"));
const VOTING_SEC = Number(arg("voting", "40"));
const GM_NAME = arg("gm-name");
const GM_PIN = arg("gm-pin");

/* ───────── tiny HTTP client with a cookie jar and timing ───────── */

const samples = new Map<string, number[]>();
const statuses = new Map<number, number>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class Agent {
  cookies = new Map<string, string>();
  constructor(public ip: string) {}
  async req(label: string, path: string, init: { method?: string; body?: unknown } = {}) {
    const headers: Record<string, string> = { "x-forwarded-for": this.ip };
    if (init.body !== undefined) headers["content-type"] = "application/json";
    if (this.cookies.size) headers.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    for (let attempt = 0; ; attempt++) {
      const t0 = performance.now();
      let res: Response;
      try {
        res = await fetch(BASE + path, {
          method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
          headers,
          body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        statuses.set(0, (statuses.get(0) ?? 0) + 1);
        return { status: 0, body: null as unknown };
      }
      const ms = performance.now() - t0;
      if (!samples.has(label)) samples.set(label, []);
      samples.get(label)!.push(ms);
      statuses.set(res.status, (statuses.get(res.status) ?? 0) + 1);
      for (const c of res.headers.getSetCookie()) {
        const [pair] = c.split(";");
        const i = pair.indexOf("=");
        const v = pair.slice(i + 1);
        if (v) this.cookies.set(pair.slice(0, i), v);
        else this.cookies.delete(pair.slice(0, i));
      }
      if (res.status === 429 && attempt < 20) {
        await sleep(Number(res.headers.get("retry-after") ?? "5") * 1000);
        continue;
      }
      const text = res.status === 304 ? "" : await res.text();
      let body: unknown = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }
      return { status: res.status, body };
    }
  }
}

const pct = (xs: number[], p: number) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

/* ───────── scenario ───────── */

interface Snapshot {
  version: number;
  me: { id: string; status: string };
  meeting: null | { id: string; status: string; candidates: { id: string }[]; me: { eligible: boolean; hasVoted: boolean } };
}

async function main() {
  if (!process.argv.includes("--yes")) throw new Error("This creates fake players in the ACTIVE game. Re-run with --yes once you've activated a test game.");
  if (!GM_NAME || !GM_PIN) throw new Error("Pass --gm-name and --gm-pin");

  const health = (await fetch(`${BASE}/api/health`).then((r) => r.json())) as { ok: boolean; game: { code: string; phase: string } | null };
  if (!health.ok || !health.game) throw new Error(`Server not healthy or no active game: ${JSON.stringify(health)}`);
  if (!/^(LOAD|TEST|REHEARSAL)/.test(health.game.code) && !process.argv.includes("--i-know")) {
    throw new Error(`Active game is ${health.game.code}. Activate a LOADTEST game first (or pass --i-know).`);
  }
  console.log(`▶ ${BASE} · game ${health.game.code} (${health.game.phase}) · ${PLAYERS} players`);

  const gm = new Agent("10.200.0.1");
  const login = await gm.req("staff login", "/api/staff/login", { body: { name: GM_NAME, pin: GM_PIN } });
  if (login.status !== 200) throw new Error(`GM login failed: ${login.status} ${JSON.stringify(login.body)}`);

  const pub = (await gm.req("public game", "/api/public/game")).body as { phase: string; registrationOpen: boolean; teams: { id: string }[] };
  if (!pub.registrationOpen) await gm.req("gm registration", "/api/gm/registration", { method: "PATCH", body: { open: true } });

  // 1. Registration burst (10 at a time).
  const runId = Math.floor(Math.random() * 90 + 10);
  const players: Agent[] = [];
  const t0 = Date.now();
  let regFail = 0;
  for (let i = 0; i < PLAYERS; i += 10) {
    await Promise.all(
      Array.from({ length: Math.min(10, PLAYERS - i) }, async (_, k) => {
        const n = i + k;
        const a = new Agent(`10.${100 + (n % 100)}.${runId}.${n % 250}`);
        const phone = `077${runId}${String(n).padStart(5, "0")}`; // 077 + 2-digit run + 5-digit index
        // Names may only contain letters, so encode the index as letters (0 → "Aa", 1 → "Ab", …).
        const letters = String.fromCharCode(65 + Math.floor(n / 26) % 26) + String.fromCharCode(97 + (n % 26));
        const r = await a.req("register", "/api/player/register", {
          body: { name: `Load Player ${letters}`, phone, teamId: pub.teams[n % pub.teams.length].id },
        });
        if (r.status === 201 || r.status === 200) players.push(a);
        else {
          if (regFail === 0) console.log(`  first registration failure: ${r.status} ${JSON.stringify(r.body)}`);
          regFail++;
        }
      }),
    );
  }
  console.log(`✔ registered ${players.length}/${PLAYERS} in ${((Date.now() - t0) / 1000).toFixed(1)} s${regFail ? ` (${regFail} failed)` : ""}`);
  if (players.length === 0) throw new Error("Nobody could register — see the first failure above.");

  // 2. Reveal roles if needed.
  const g = (await gm.req("gm state", "/api/gm/state")).body as { game: { phase: string } };
  if (g.game.phase === "LOBBY") {
    const r = await gm.req("reveal", "/api/gm/roles/reveal", { body: { confirm: "REVEAL" } });
    console.log(`✔ roles revealed (${r.status})`);
  }

  // 3. Polling loops.
  let stop = false;
  let voting = false;
  const latest = new Map<Agent, Snapshot>();
  const pollLoop = async (a: Agent, label: string, path: string, every: () => number) => {
    let v: number | null = null;
    await sleep(Math.random() * every());
    while (!stop) {
      const r = await a.req(label, `${path}${v !== null ? `${path.includes("?") ? "&" : "?"}v=${v}` : ""}`);
      if (r.status === 200 && r.body && typeof r.body === "object") {
        v = (r.body as { version: number }).version;
        if (label === "player state") latest.set(a, r.body as Snapshot);
      }
      await sleep(every() * (0.85 + Math.random() * 0.3));
    }
  };
  const loops = [
    ...players.map((p) => pollLoop(p, "player state", "/api/player/state", () => (voting ? 1500 : 3000))),
    pollLoop(gm, "gm state", "/api/gm/state", () => (voting ? 1500 : 2000)),
    pollLoop(new Agent("10.250.0.1"), "display", "/api/public/display", () => (voting ? 1500 : 3000)),
  ];

  console.log(`… polling for ${IDLE_SEC} s`);
  await sleep(IDLE_SEC * 1000);

  // 4. Meeting + voting burst.
  const call = await gm.req("meeting call", "/api/gm/meetings", { body: { override: true } });
  if (call.status !== 201) throw new Error(`Couldn't call a meeting: ${call.status} ${JSON.stringify(call.body)}`);
  const meetingId = (call.body as { meeting: { id: string } }).meeting.id;
  await gm.req("open voting", `/api/gm/meetings/${meetingId}/open-voting`, { body: { durationSec: Math.max(60, VOTING_SEC + 30) } });
  voting = true;
  await sleep(3000); // let phones see the vote panel

  let votesOk = 0;
  const voters = new Set<Agent>();
  await Promise.all(
    players.map(async (p) => {
      await sleep(Math.random() * 20_000); // everyone votes within ~20 s
      const s = (await p.req("player state", "/api/player/state")).body as Snapshot;
      if (!s?.meeting?.me.eligible || s.meeting.candidates.length === 0) return;
      const target = s.meeting.candidates[Math.floor(Math.random() * s.meeting.candidates.length)].id;
      const r = await p.req("vote", "/api/player/votes", { body: { meetingId, targetId: target } });
      if (r.status === 201) votesOk++;
      if (r.status === 200 || r.status === 201) voters.add(p);
      // A nervous double tap from some phones: must not create a second vote.
      if (Math.random() < 0.2) await p.req("vote (retry)", "/api/player/votes", { body: { meetingId, targetId: target } });
    }),
  );
  await sleep(Math.max(0, VOTING_SEC * 1000 - 23_000));

  const gmView = (await gm.req("gm state", "/api/gm/state")).body as { meeting: { votes: unknown[] } | null };
  const storedVotes = gmView.meeting?.votes.length ?? -1;
  await gm.req("cancel meeting", `/api/gm/meetings/${meetingId}/cancel`, { body: { reason: "load test finished" } });
  voting = false;
  stop = true;
  await Promise.all(loops);

  // 5. Report.
  console.log("\nendpoint               count     p50     p95     p99     max (ms)");
  let worstP95 = 0;
  for (const [label, xs] of [...samples].sort()) {
    const p95 = pct(xs, 95);
    if (!label.startsWith("register") && !label.startsWith("reveal")) worstP95 = Math.max(worstP95, p95);
    console.log(
      `${label.padEnd(20)} ${String(xs.length).padStart(7)} ${pct(xs, 50).toFixed(0).padStart(7)} ${p95.toFixed(0).padStart(7)} ${pct(xs, 99).toFixed(0).padStart(7)} ${Math.max(...xs).toFixed(0).padStart(7)}`,
    );
  }
  const total = [...statuses.values()].reduce((a, b) => a + b, 0);
  const fivexx = [...statuses].filter(([s]) => s >= 500 || s === 0).reduce((a, [, n]) => a + n, 0);
  console.log(`\nstatus codes: ${[...statuses].sort().map(([s, n]) => `${s}×${n}`).join("  ")}  (total ${total})`);
  console.log(`votes: ${votesOk} new, ${voters.size} voters, ${storedVotes} stored`);

  const checks = [
    [`p95 < 800 ms (polling & votes)`, worstP95 < 800, `${worstP95.toFixed(0)} ms`],
    ["zero 5xx / network errors", fivexx === 0, `${fivexx}`],
    ["no duplicate votes", storedVotes === voters.size, `${storedVotes} stored for ${voters.size} voters`],
  ] as const;
  console.log("");
  for (const [name, ok, detail] of checks) console.log(`${ok ? "✔ PASS" : "✖ FAIL"}  ${name}  (${detail})`);
  if (checks.some(([, ok]) => !ok)) process.exitCode = 1;
}

// Exit explicitly: on an error the polling loops would otherwise keep the process alive.
main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => {
    console.error("✖", e instanceof Error ? e.message : e);
    process.exit(1);
  });
