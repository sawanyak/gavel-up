# Phase 6: Physical Test Checklist (Projector & Final Reveal)

**What Phase 6 covers:**

- the projector screen at `/display` (no login) and the GM's screen switcher
- the final reveal, one step at a time: impostors → predictions → leaderboard → winner → finish
- "Impostors win" / "Crew wins" and the winning team (including ties)
- game stats, backups (JSON/CSV) and the audit log
- the game becoming read-only at the end

This is the closest thing to a full rehearsal, so it also re-checks earlier phases.

**Time needed:** about 45 minutes.

**What you need:**

| Item | Purpose |
|---|---|
| 1 laptop | The **GM screen** |
| A second screen or a TV/projector | The **projector**: open `http://<laptop IP>:3000/display` in a browser and make it full screen (⛶ button, top right) |
| At least 6 phones or browser windows | Players: **3 on Red**, **3 on Blue** |
| 1 extra browser | The **Team Manager** for Red (optional) |

**Before you start:** run the setup from Phase 1, step 0. Keep `/display` open the whole time.

Tick each box as you go. For any failure, note the step number, what you expected, and what happened.

---

## 1. Projector before the game

- [ ] **1.1** `/display` opens **without logging in**. It shows the Gavel Up title, the game name, team crewmates and "N players on board".
- [ ] **1.2** On the GM dashboard, the **Projector** card has buttons. Only **Welcome**, **Join QR**, **Rules** and **Leaderboard** are clickable. The rest are greyed out.
- [ ] **1.3** Open registration and press **Join QR**. Within about 3 seconds the projector shows a big QR code, three steps, the URL and a live "registered" count.
- [ ] **1.4** Scan the QR **from the projector** with a phone and register. The count goes up.
- [ ] **1.5** Press **Rules**: the three character cards and the ghost rule appear. Nothing about who is who.
- [ ] **1.6** Click **Enable sound** on the projector (top right). No music starts.

---

## 2. Projector during the game

1. Register all 6 players, **Reveal roles** (the projector switches to **Rules** by itself), give some points on **Points** and complete a task.

- [ ] **2.1** **Leaderboard** shows big bars with team colours and live scores.
- [ ] **2.2** Call an **emergency meeting**. The projector switches to a red **EMERGENCY MEETING** screen by itself (with the alarm, since sound is on).
- [ ] **2.3** Open voting. The projector shows **VOTING** with the countdown and "voted/eligible" bars per team. It **never** shows who voted for whom.
- [ ] **2.4** When the timer ends, it says "Voting closed — results coming up".
- [ ] **2.5** Reveal results. The projector shows **MEETING RESULTS** per team ("X WAS AN IMPOSTOR" / "was not an impostor" / "Nobody was ejected").
- [ ] **2.6** Send an announcement for **Everyone**. It appears at the bottom of the projector. A Red-only announcement does **not**.
- [ ] **2.7** Confirm and resume the game. The projector goes back to the leaderboard.

**Tip:** in the meeting, have Red vote out its impostor and Blue vote out a crewmate, and have one Red phone make a **prediction** on Blue's real impostor.

---

## 3. The final reveal

1. On the GM screen open **Final** in the staff menu.

- [ ] **3.1** Only step 1 is active. Its **Go** asks you to type `FINAL`. (If a meeting is still running, it tells you to finish it first.)
- [ ] **3.2** After starting: phones say "The final reveal has started — watch the big screen!". The tasks list, live leaderboard and kill buttons are gone. Registration is closed. The projector shows **THE FINAL REVEAL**.
- [ ] **3.3** The projector's **Leaderboard** button is greyed out now (no early spoilers).
- [ ] **3.4** Step 2 **Reveal the impostors**: the projector shows every impostor with their team and **CAUGHT** / **ESCAPED**. Phones list them too.
- [ ] **3.5** Step 3 **Score predictions**: phones list each prediction with ✓ +30 or ✗ −15.
- [ ] **3.6** Step 4 **Show the final leaderboard** (confirm): the projector shows the final ranking. Try giving points on **Points** now: it's refused with "Scores are final".
- [ ] **3.7** Step 5 **Announce the winner**: the projector shows **IMPOSTORS WIN** (only 1 impostor caught, fewer than 2) and the winning team with a crown. Phones show the same, and "That's your team — congratulations!" on the winning team's phones.
- [ ] **3.8** Press **Stats** on the projector: players, kills, voted out, turnout, tasks, predictions, meetings.
- [ ] **3.9** Refresh the projector, a phone and the GM page. Everything shows **exactly** the same results.
- [ ] **3.10** Pressing a step twice (or from two GM screens) never changes the result.

---

## 4. Backups and audit log

- [ ] **4.1** On the **Final** page, download **Full backup (JSON)**, **Players (CSV)** and **Points (CSV)**.
  - The CSVs open in Excel with names shown correctly.
  - The files contain **no phone numbers** and no PINs.
- [ ] **4.2** Open **Audit** in the staff menu. It lists actions newest first (kills, votes closed, points, final steps…), with who did them. **details** expands. **Load older** loads more.
- [ ] **4.3** The action filter (e.g. `PLAYER_KILLED`) narrows the list.

---

## 5. Finish

- [ ] **5.1** Step 6 **Finish & archive** (type `FINISH`). The phase chip says **Game over**.
- [ ] **5.2** Phones, the TM page and the projector still show the results after a refresh.
- [ ] **5.3** Nothing can be changed any more: giving points, killing, creating tasks or calling a meeting all say "This game has finished."

---

## 6. Tie for first place (optional)

1. Reset to a fresh game. Make two teams finish on the **same** score.

- [ ] **6.1** With the default setting, **Announce the winner** shows both as **Winning teams**.

---

## Result

| | |
|---|---|
| Tester | |
| Date | |
| Phones, browsers and screens used | |
| All boxes ticked? | ☐ Yes ☐ No (list failing step numbers below) |

Notes / failures:
