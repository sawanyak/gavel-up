# Deploying the live game (Vercel + MongoDB Atlas)

**Who this is for:** whoever sets up the production site before the event.

**Time needed:** about 45 minutes the first time.

**Target dates:** deploy by **19 Nov**, rehearse on **20 Nov**, run the game on **21 Nov**.

---

## 1. MongoDB Atlas

1. Create a project and a cluster in **AWS ap-south-1 (Mumbai)**, the closest region to Sri Lanka.
2. **Tier:** use **Flex** or the smallest dedicated tier (M10) for 19–21 Nov. Downgrade or delete afterwards.
   - Don't use the free M0 tier on event day. It limits connections and throughput, and has no backups.
3. **Database Access:** create a user, e.g. `gavelup-app`.
   - Give it a long generated password.
   - Role: **readWrite** on the database `gavelup` only.
4. **Network Access:** add `0.0.0.0/0`.
   - Vercel's IP addresses change, so you can't allow-list them.
   - The strong password and the single-database role are what protect the data.
5. **Connect → Drivers:** copy the connection string and add the database name, e.g.
   `mongodb+srv://gavelup-app:<password>@cluster0.xxxxx.mongodb.net/gavelup?retryWrites=true&w=majority`

The app needs **transactions**. Every Atlas cluster supports them (they're replica sets).

## 2. Vercel

1. Import the GitHub repository into Vercel. Framework: **Next.js**. No build settings need changing.
   - `vercel.json` already pins the functions to `bom1` (Mumbai), next to the database.
2. **Settings → Environment Variables** (Production):

| Variable | Value |
|---|---|
| `MONGODB_URI` | The Atlas string from step 1.5 |
| `PUBLIC_BASE_URL` | The public site address, e.g. `https://gavelup.example.com` (no trailing slash). It's what the QR code encodes. |

   Never set `DISABLE_RATE_LIMIT` in production.

3. Deploy. Then open `https://<your-domain>/api/health`.
   - Expected: `{"ok":true,"db":"up",…,"game":null}`.
   - `game` is `null` until you seed in the next step.

**Plan limits:** about 80 phones polling every 3 s for 3 hours is roughly 300k function calls, and most return a tiny `304`. Check the current Vercel Hobby limits (invocations and active CPU) before the event. If you're close, start a Pro trial for the week.

## 3. Create the games and the first Game Master

Run these on your laptop. Put the **production** `MONGODB_URI` in `.env.local` **temporarily**.

```bash
# .env.local (temporarily): MONGODB_URI=<production string>, BOOTSTRAP_GM_NAME=..., BOOTSTRAP_GM_PIN=<6 digits>

npm run seed -- --code REHEARSAL --name "Gavel Up rehearsal" --activate   # for 20 Nov
```

1. Check `/api/health`. It should now show `"game":{"code":"REHEARSAL",…}`.
2. Log in at `/staff/login` with the bootstrap GM.
3. In **Teams & Staff**, create:
   - the second host as a **GM**, each with their own 6-digit PIN;
   - one **Team Manager** per team.
4. Afterwards, change `.env.local` back to your local database.

**After the rehearsal (20 Nov evening):**

```bash
npm run seed -- --code GAVELUP26 --name "Gavel Up 2026" --activate
```

- This makes the real game active.
- The rehearsal game stays in the database and can be looked at later.
- Staff accounts carry over, because they're shared between games.
- Then **print the QR posters** from `/gm/qr` on the production domain.
  - The QR code contains the game code (`?g=GAVELUP26`), so rehearsal posters won't work. Print the real ones only after `GAVELUP26` is active.

## 4. Event-day switches

- In `src/config/eventConfig.ts`, set `liveGameRegistrationEnabled: true` and deploy. Every "Register Now" button on the website then opens the live game sign-up instead of the Google Form.
- Open `https://<your-domain>/display` on the projector laptop. Press **⛶** for full screen and **Enable sound**.

## 5. Load test (before the rehearsal)

Run it against the **deployed** site, with a throw-away game active:

```bash
npm run seed -- --code LOADTEST --name "Load test" --activate          # production DB, temporarily
npm run load-test -- --url https://<your-domain> --gm-name "<GM name>" --gm-pin <PIN> --players 100 --yes
npm run seed -- --code REHEARSAL --activate                             # switch back
```

Pass criteria:

- **p95 < 800 ms**
- **zero 5xx**
- **no duplicate votes**

Watch Atlas → Metrics (connections, operations per second) while it runs.

- On Vercel, all fake players share your IP, so registration is rate-limited to 60 per minute. The script waits and retries, so 100 players take about 2 minutes to register.
- Local reference result, 18 Nov, 100 players: polling p95 53 ms, voting p95 131 ms, 0 errors, 0 duplicate votes.

## 6. Backups

Take a backup at each of these points:

- the evening before (after creating `GAVELUP26`);
- right after **Reveal roles**;
- after the meeting;
- at the end.

Two ways to do it:

- **In the app:** GM → **Final** → **Full backup (JSON)**. It works at any time and contains no phone numbers or PINs.
- **Whole database:** `mongodump --uri "<MONGODB_URI>" --out backup-YYYYMMDD-HHMM`.

## 7. After the event (within 30 days)

```bash
npm run purge-pii -- --code GAVELUP26          # dry run: shows what would be removed
npm run purge-pii -- --code GAVELUP26 --yes    # removes every phone number, session and login code
```

- Names, teams and results stay.
- Then downgrade or pause the Atlas cluster.
