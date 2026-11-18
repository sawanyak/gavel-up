# Game Master Runbook: Gavel Up, 21 Nov

**For:** the two hosts. Print this page and keep it by the GM laptop.

**Golden rule:** one host presses the buttons, the other watches. The GM pages show who else is logged in, so agree out loud before pressing anything.

## Before doors open

1. Open `https://<site>/api/health`. It must show `"ok":true` and game `GAVELUP26`.
2. Log in on the GM laptop at `/staff/login`.
3. Open `/display` on the projector laptop. Press **⛶** (full screen) and **Enable sound**.
4. TMs log in on their phones at `/staff/login` and land on **My Team**.
5. QR posters are up at the registration desk.
6. GM dashboard → **Open registration**.
7. Projector card → **Join QR**.
8. **Paper fallback kit** at the desk:
   - printed roster,
   - ballots,
   - score sheet.

## The game, button by button

| When | Where | Press | What players see |
|---|---|---|---|
| Arrival | Dashboard | **Open registration**. Watch **Live registrations**. | Registration form → "Stand by" |
| Everyone's in | Dashboard | **Reveal roles**, type `REVEAL` | Full-screen secret role |
| Explain rules | Projector card | **Rules** | — |
| Tasks | **Tasks** | **Reveal** each task (Everyone / teams / players) | Tasks card on phones |
| Activities | **Points** (or TMs on their page) | Give points: Table Topics, Q&A… | Points feed, leaderboard |
| Sticker kill | TM page 💀 (or the dashboard row) | Confirm | Victim sees the ghost screen |
| Detective asks you | Dashboard | **Detective question**: pick detective + name → read **YES/NO** quietly | Their role card shows the answer |
| Announcement | Dashboard | **Announcements → Send** | Banner + sound |
| Meeting | **Meeting** | **Call emergency meeting** → **Open voting** (180 s) | Red alarm → vote list + timer |
| Timer ends | **Meeting** | (closes by itself) Break any tie → **Reveal results** | Who was ejected, impostor or not |
| After results | **Meeting** | **Confirm** (type `CONFIRM`) → **Resume game** | Ejected players become ghosts |
| Finale | **Final** | **Full backup (JSON)** first, then steps 1→6 in order | "Watch the big screen", then the reveals |

**Final steps, in order:**

1. **Start** (type `FINAL`)
2. **Reveal impostors**
3. **Score predictions**
4. **Leaderboard** (scores freeze here)
5. **Announce winner**
6. **Stats** on the projector, then **Finish** (type `FINISH`) at the very end

## If something goes wrong

| Problem | Fix |
|---|---|
| Player can't register: "already registered" | They (or someone) used that phone. TM checks the person, presses **Code** next to their name, and the player enters it at `/play/recover`. |
| Player on a new / dead phone | Same: **Code** → `/play/recover`. Their old phone is logged out. |
| Wrong team | Dashboard → ✏️ → change team. After roles are revealed it asks to **Move anyway**. |
| Duplicate / junk registration | Dashboard → 🗑 with a reason. |
| A team has no impostor (late joiners) | Roles panel warning → **Random impostor**. Tell that player in person. |
| Wrong kill | Dashboard → 💗 on the ghost, with a reason. |
| Wrong points | **Points** → ↶ on that line, with a reason. |
| Meeting called by mistake | **Meeting → Cancel meeting**. It doesn't count. |
| Someone voted on the wrong phone | **Meeting → Votes & predictions → 🗑** on that vote. They can vote again. |
| People missed the vote (bad signal) | Before revealing: **Reopen voting +30s**. |
| Tie in a team | Tied names appear as buttons. Pick one, or **Nobody**. |
| Two teams tie for the win | Shared win (default). |
| A phone shows "Reconnecting…" | Usually venue Wi-Fi. Ask them to switch to mobile data. It catches up on its own. |
| Whole site down / `/api/health` not ok | Keep playing on paper: printed roster, ballots and score sheet. Check Vercel and Atlas status. Data isn't lost: everything is saved in the database. |
| Projector frozen | Refresh `/display` (F5). It loads the current state. |

## Never

- Don't press **Reveal roles**, **Confirm**, **Leaderboard** or **Finish** "to test". They can't be undone.
- Don't let the GM laptop face the audience while **Show names** is on.
- Don't give out the GM PIN. Make a TM account instead.
