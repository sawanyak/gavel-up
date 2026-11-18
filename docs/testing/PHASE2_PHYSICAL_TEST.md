# Phase 2: Physical Test Checklist (Role System)

**What Phase 2 covers:**

- the **Reveal Roles** button
- secret role cards on phones
- the impostor ally list
- the detective's investigation counter
- late joiners
- GM role tools (preview, role settings, override, random fill)
- the public **How to Play** page

**Time needed:** about 30 minutes.

**What you need:**

| Item | Purpose |
|---|---|
| 1 laptop | The **GM screen** |
| At least 6 phones or browser windows | Players. Private/incognito windows count as separate players. |
| 1 extra browser | The **Team Manager** |

**Before you start:** run the setup from Phase 1, step 0 (`npm run db:local`, `npm run seed`, `npm run dev:lan`).

**To start again from a clean game:**

1. Stop `db:local`.
2. Delete the `.local-db` folder.
3. Run `npm run db:local` and `npm run seed` again.

Tick each box as you go. For any failure, note the step number, what you expected, and what happened.

---

## 1. Print the QR poster (Phase 1 fix)

1. Log in as GM and open `/gm/qr` **using the laptop's IP address** (e.g. `http://192.168.1.23:3000/gm/qr`).

- [ ] **1.1** No yellow "localhost" warning appears. Open the page via `http://localhost:3000/gm/qr` instead and the warning **does** appear.
- [ ] **1.2** **Print poster** → the print preview shows a clean **white A4 page**:
  - the club logo
  - "SCAN TO JOIN THE CREW"
  - a big QR code
  - three numbered steps
  - the URL

  There must be **no** starry background, no header bar and no buttons.
- [ ] **1.3** Scanning the printed (or previewed) QR code with a phone opens the registration page.

---

## 2. Public How to Play page

- [ ] **2.1** The marketing navbar has a new **How to Play** link (desktop and mobile menu).
- [ ] **2.2** The page shows:
  - the 5 game steps
  - the 3 characters (Crewmate, Detective, Impostor)
  - the ghost rules
  - meeting and prediction rules
  - a scoring table

  It does **not** mention a Medic.
- [ ] **2.3** It looks right on a phone (no sideways scrolling).

---

## 3. Role settings and preview (before reveal)

1. Open registration on the GM dashboard. Register **6 phones/windows**: **3 on Red**, **3 on Blue**.
2. Go to **Teams & Staff**, then the **Role settings** card.

- [ ] **3.1** It shows impostors per team **1**, detectives per team **1**, min team size **3**, and "Impostors see each other" ticked.
- [ ] **3.2** Set "Extra impostors for a specific team" → Red = **2** and save. You see "Saved…".
- [ ] **3.3** Back on the dashboard, press **Reveal roles** (don't confirm yet). The preview table shows **Red: 2 impostors, 0 detectives, 1 crewmate**.
  - Red's 3 players can't fit 2 impostors + 1 detective + at least 1 crewmate, so the detective is dropped.
  - Empty teams (Green/Yellow/Purple) show a "has no players" note.
- [ ] **3.4** Cancel. Set Red's override back to **default** and save. The preview now shows Red: 1 impostor, 1 detective, 1 crewmate.

---

## 4. Reveal Roles

1. **Before revealing:** every phone shows the **Stand by** card and no role.
2. Press **Reveal roles**.

- [ ] **4.1** The **Reveal roles** button stays disabled until you type `REVEAL` exactly.
- [ ] **4.2** After confirming, **within about 4 seconds every phone** shows a black full-screen "🤫 ROLES ARE IN" screen. Phones vibrate on Android.
- [ ] **4.3** Tapping **Reveal my role** shows the role: **CREWMATE** (cyan), **DETECTIVE** (yellow) or **IMPOSTOR** (red). The reveal sound plays if sound was unmuted.
- [ ] **4.4** After **Got it**, the dashboard shows a **Secret role** card with `• • • • • •`. It's hidden until you tap **Tap to view**, and it hides itself again after about 15 seconds.
- [ ] **4.5** Refresh a phone. The full-screen reveal does **not** play again, and the role card is still there.
- [ ] **4.6** The GM dashboard shows "Roles revealed HH:MM", the phase **Game in progress**, and a **Roles** panel with the count table. **Names are hidden** until you press **Show names**.
- [ ] **4.7** Each team with 3 players has exactly **1 impostor + 1 detective + 1 crewmate**.
- [ ] **4.8** Press **Show names**. The panel lists who is the impostor and detective per team, and role chips appear in the registration list. **Hide names** hides them again.

---

## 5. Role privacy (most important)

- [ ] **5.1** Each phone's role matches what the GM panel says for that person.
- [ ] **5.2** On an **impostor** phone, the role card has **Fellow impostors** listing the **other** impostor (the one on the other team) with their team colour, and not itself.
- [ ] **5.3** On a **detective** phone, it shows "Investigations: **1 of 1 remaining**". There's no impostor list.
- [ ] **5.4** On a **crewmate** phone, there's no impostor list and no investigation counter. The team list shows names only, with no roles.
- [ ] **5.5** The **Team Manager** view (`/tm`) shows names and statuses only, with **no roles** anywhere.
- [ ] **5.6** The projector-safe pages (`/how-to-play`, home page) show **no** roles.

---

## 6. Double clicks and two GMs

1. In **Teams & Staff**, create a second GM (for example `Host Two`, PIN `333333`). Log in as them on another browser.
2. Reset to a fresh game (see "Before you start"), register 6 players again, and open the **Reveal roles** dialog on **both** GM screens.
3. Type `REVEAL` on both and press **Reveal roles** on both at the same moment.

- [ ] **6.1** Roles are assigned **once**. Each team still has exactly 1 impostor + 1 detective. One GM may see "Roles are being revealed right now", and that's fine.
- [ ] **6.2** No phone's role changes after the first reveal (refresh to check).

---

## 7. Late joiners

1. Register a **new phone** on **Red** after roles are revealed.

- [ ] **7.1** It goes straight to the role reveal and gets **CREWMATE**, with the note "You joined after roles were revealed…".
- [ ] **7.2** Nobody else's role changed.
- [ ] **7.3** The GM registration list shows a **late** tag on that player.

2. Register **3 new phones** on **Green** (a team that had nobody at the reveal).

- [ ] **7.4** The GM **Roles** panel shows a yellow warning "Green: no impostor & no detective", with **Random impostor** and **Random detective** buttons.
- [ ] **7.5** Press **Random impostor**. A message names who became the impostor. That phone's role card now says **IMPOSTOR** (refresh or wait a few seconds), and the warning for impostor disappears.
  - Tell that player in person: a phone that already saw its reveal won't play the full-screen animation again.

---

## 8. GM fixes a mistake (role override)

1. On the GM dashboard, press **Edit** (✏️) on a crewmate, then **Show / change** under Secret role.
2. Change the role to **Detective**, enter the reason `testing override`, and save.

- [ ] **8.1** That player's role card shows **DETECTIVE** within a few seconds.
- [ ] **8.2** Saving without a reason is refused ("Give a reason").
- [ ] **8.3** Role settings in **Teams & Staff** now show **LOCKED — roles revealed** and can't be edited.

---

## Result

| | |
|---|---|
| Tester | |
| Date | |
| Phones and browsers used | |
| All boxes ticked? | ☐ Yes ☐ No (list failing step numbers below) |

Notes / failures:
