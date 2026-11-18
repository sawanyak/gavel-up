# Phase 7: Launch Checklist (deploy, devices, load, rehearsal)

**What Phase 7 covers:** getting from "it works on my laptop" to "it works in the hall".

| When | Part |
|---|---|
| By 19 Nov | Parts 1–3 |
| 20 Nov | Part 4 (rehearsal) |
| Morning of 21 Nov | Part 5 |

Tick each box as you go. For any failure, note the step number, what you expected, and what happened.

**Already checked automatically** (`npm test`, 218 tests):

- a whole game with 3 teams × 5 players, from sign-up to archive, with every GM button pressed twice;
- privacy checks on every non-GM response at every step;
- refreshes giving identical views.

---

## 1. Deployment (follow [DEPLOYMENT.md](../DEPLOYMENT.md))

- [ ] **1.1** Atlas cluster is in **Mumbai (ap-south-1)** on Flex/M10, not M0. The DB user has `readWrite` on `gavelup` only.
- [ ] **1.2** Vercel env vars `MONGODB_URI` and `PUBLIC_BASE_URL` are set. `DISABLE_RATE_LIMIT` is **not** set.
- [ ] **1.3** `https://<site>/api/health` shows `"ok":true` and `"db":"up"`.
- [ ] **1.4** The site is on **https**. After registering on a phone, the browser shows the site as secure. The session cookie is `Secure` (DevTools → Application → Cookies).
- [ ] **1.5** The marketing pages (Home, About, Why Join, Contact, How to Play) look the same as before.

## 2. Load test against the deployed site

- [ ] **2.1** `npm run load-test -- --url https://<site> … --players 100 --yes` (see DEPLOYMENT.md §5) prints three **✔ PASS** lines:
  - p95 < 800 ms,
  - zero 5xx,
  - no duplicate votes.
- [ ] **2.2** In Atlas → Metrics, connections stayed well under the tier limit.
- [ ] **2.3** Switched back to the REHEARSAL game afterwards (`/api/health` shows it).

## 3. Device sweep (real phones)

Use at least: one **cheap Android** (Chrome), one **iPhone** (Safari), one **older phone** and one **small screen**.

On each:

- [ ] **3.1** The QR code scans and the registration form fits the screen (no sideways scrolling, buttons easy to tap).
- [ ] **3.2** Role reveal: the full-screen overlay, the sound (after unmuting), and vibration on Android.
- [ ] **3.3** The role card hides itself after about 15 s.
- [ ] **3.4** The emergency alarm appears, the countdown is in step with the projector, and voting works with one thumb.
- [ ] **3.5** Lock the phone for a minute during the game, then unlock. The page catches up within a few seconds.
- [ ] **3.6** Switch between Wi-Fi and mobile data mid-game. "Reconnecting…" appears briefly, then everything is correct.
- [ ] **3.7** Airplane mode while voting: the vote is **not** shown as recorded. After reconnecting, tapping again works once.
- [ ] **3.8** The projector laptop's browser shows `/display` full screen, readable from the back of the room.

## 4. Rehearsal (20 Nov)

**Who:** 8–15 club members on real phones, **both GMs**, **at least 2 TMs**, and the projector. Use the **venue Wi-Fi** if possible.

**How:** follow [GM_RUNBOOK.md](../GM_RUNBOOK.md) from top to bottom, and **make these mistakes on purpose:**

- [ ] **4.1** Mark the wrong person killed → **revive** them.
- [ ] **4.2** Give points to the wrong team → **reverse** it.
- [ ] **4.3** Call a meeting by accident → **cancel** it. Then call the real one.
- [ ] **4.4** Someone votes from a friend's phone → **remove that vote**. The friend votes again.
- [ ] **4.5** Make a **tie** in one team → break it as GM.
- [ ] **4.6** A player "loses" their phone → TM gives a **Code** → they log in on another phone, and the old phone is logged out.
- [ ] **4.7** Two GMs press the same button at the same time (e.g. **Reveal results**). Nothing happens twice.
- [ ] **4.8** Run the whole **Final** sequence and download the backups.
- [ ] **4.9** Time it. Note how long registration, the meeting and the finale took: _______
- [ ] **4.10** Write down anything confusing for players or staff: _______

**After the rehearsal:**

- [ ] **4.11** Run `npm run seed -- --code GAVELUP26 --name "Gavel Up 2026" --activate`. `/api/health` shows `GAVELUP26`.
- [ ] **4.12** Print the QR posters from `/gm/qr` (production domain, GAVELUP26). Scan one to check.
- [ ] **4.13** Set `liveGameRegistrationEnabled: true` in `src/config/eventConfig.ts` and deploy. "Register Now" opens the live sign-up.
- [ ] **4.14** Take a `mongodump` backup.
- [ ] **4.15** Print the paper fallback kit:
  - roster sheet per team,
  - ballot slips,
  - score sheet,
  - the GM runbook.

## 5. Morning of 21 Nov

- [ ] **5.1** `/api/health` is ok with `GAVELUP26`, phase **Setup**.
- [ ] **5.2** Both GMs and every TM can log in. **PINs are written down privately**, not on the runbook.
- [ ] **5.3** Projector shows `/display` → **Join QR** after **Open registration**.
- [ ] **5.4** One test registration from a staff phone, then **remove** it (🗑, reason "test").

## Sign-off

| | |
|---|---|
| Host 1 | |
| Host 2 | |
| Date | |
| Load test result (p95 / errors / duplicates) | |
| Ready for event? | ☐ Yes ☐ No: what's missing: |
