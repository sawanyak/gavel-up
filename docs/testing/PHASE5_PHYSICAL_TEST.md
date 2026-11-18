# Phase 5: Physical Test Checklist (Scoring)

**What Phase 5 covers:**

- Game Masters and Team Managers giving or taking points (table topics, Q&A, penalties)
- the limits on how many points a Team Manager can give
- double-tap and bad-connection safety
- the **Points** page: history, filters, reversing a mistake, rechecking scores
- the leaderboard and "Recent points" on phones

Scoring predictions (+30 / −15) happens during the final reveal, so it's tested in Phase 6.

**Time needed:** about 25 minutes.

**What you need:**

| Item | Purpose |
|---|---|
| 1 laptop | The **GM screen** |
| 4 phones or browser windows | Players: **2 on Red**, **2 on Blue** |
| 1 extra browser | The **Team Manager** for Red (`/tm`) |

**Before you start:**

1. Run the setup from Phase 1, step 0, register the 4 players and **Reveal roles**.
2. Create the Team Manager `Red Manager` (PIN `222222`) for **Red** and log in on the extra browser.
3. On **Tasks**, create an **Activity** called "Table topics" and reveal it.

Tick each box as you go. For any failure, note the step number, what you expected, and what happened.

---

## 1. Team Manager gives points

1. On the TM page, find **Give points**.

- [ ] **1.1** It only offers **Red** (no team picker), with chips **+5 +10 +20 −5 −10** and "-20 to +20".
- [ ] **1.2** Choose **+10**, tap the **Table Topics** preset, pick "Table topics" as the activity and a Red player under "Who earned it?", then press **Give +10 points**. A green message says "+10 to Red — now 10 pts".
- [ ] **1.3** Within a few seconds, Red phones show **10 pts** on the team card, "+10 Table topics: Table Topics" under **Recent points**, and Red first on the **Leaderboard**.
- [ ] **1.4** Blue phones see the leaderboard change, but **not** Red's "Recent points".
- [ ] **1.5** Typing **25** in "other" keeps the button disabled. Typing **0** does too.
- [ ] **1.6** Give **−5** with the reason "Too loud". It shows in red as a penalty, and Red's score drops by 5.

---

## 2. Double taps and bad connection

- [ ] **2.1** Choose +5, type a reason and tap the button **several times fast**. Red's score goes up by **5** only once.
- [ ] **2.2** Put the TM's device offline (airplane mode or DevTools → Network → Offline), then press **Give +5**. You see "No connection…". Go back online and press the **same** button again. Red goes up by **5** exactly once (not 10).

---

## 3. GM Points page

1. On the GM screen, open **Points** in the staff menu.

- [ ] **3.1** The GM form has a team picker for all teams and allows −100 to +100.
- [ ] **3.2** Give **Blue +50** "Q&A sweep". The leaderboard reorders. Teams with equal scores share the same rank number.
- [ ] **3.3** **Points history** shows every award newest first, with the team colour, who gave it and the time. Task completions and meeting-vote points (if you did Phase 3/4 steps) also appear.
- [ ] **3.4** The **team** and **type** filters (e.g. "Penalties") narrow the list correctly.

---

## 4. Reversing a mistake

- [ ] **4.1** Press ↶ on the Blue +50 and give the reason "wrong team". A new **−50** "Reversed (wrong team): Q&A sweep" line appears. The original is struck through and marked **reversed**. Blue's score goes back down.
- [ ] **4.2** Reversed lines and the correction lines have no ↶ button (each can be reversed only once).
- [ ] **4.3** The reversal is visible on Blue phones under **Recent points** as a correction.
- [ ] **4.4** The TM page has no reverse button anywhere.

---

## 5. Recheck scores

- [ ] **5.1** Press **Recheck scores** and confirm. It says "All scores already matched the history." Nothing changes.

---

## 6. Refresh

- [ ] **6.1** Refresh a phone, the TM page and the GM Points page. Scores, the leaderboard and the history are unchanged.

---

## Result

| | |
|---|---|
| Tester | |
| Date | |
| Phones and browsers used | |
| All boxes ticked? | ☐ Yes ☐ No (list failing step numbers below) |

Notes / failures:
