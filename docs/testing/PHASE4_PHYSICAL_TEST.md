# Phase 4: Physical Test Checklist (Emergency Meeting & Voting)

**What Phase 4 covers:**

- calling the emergency meeting (alarm on every phone)
- voting inside each team, with a timer that closes by itself
- the GM breaking ties and revealing results
- confirming eliminations and the correct-vote points
- optional cross-team predictions and their team lock
- fixes: reopen voting, remove a vote, cancel a meeting

**Time needed:** about 40 minutes.

**What you need:**

| Item | Purpose |
|---|---|
| 1 laptop | The **GM screen** (open **Meeting** in the staff menu) |
| At least 8 phones or browser windows | Players: **4 on Red**, **4 on Blue**. Private/incognito windows count as separate players. |
| 1 extra browser | The **Team Manager** for Red (`/tm`) |

**Before you start:**

1. Run the setup from Phase 1, step 0, register the 8 players and **Reveal roles**.
2. On the GM dashboard press **Show names** and note each team's **impostor**. Press **Hide names**.
3. Turn sound on on a couple of phones (speaker icon).

Tick each box as you go. For any failure, note the step number, what you expected, and what happened.

---

## 1. Calling the meeting

1. On the GM screen open **Meeting**, press **Call emergency meeting** and confirm.

- [ ] **1.1** Within about 4 seconds every phone shows a full-screen red **EMERGENCY MEETING** with the alarm sound. Android phones vibrate.
- [ ] **1.2** After **Go to the meeting**, phones show "Gather with your team and discuss". Refreshing doesn't replay the alarm.
- [ ] **1.3** The GM dashboard's meeting button is red and pulsing. The phase chip says **Emergency meeting**.
- [ ] **1.4** The TM page shows the meeting card.
- [ ] **1.5** While it says **Discussion**, the TM can still mark a kill (💀). Mark one Blue player killed now to test ghosts in step 3.

---

## 2. Voting

1. On the GM screen set **Voting time** to `90` and press **Open voting**.

- [ ] **2.1** Every phone shows a countdown and the names of their **own** alive teammates. Their own name and other teams' players are **not** in the list.
- [ ] **2.2** The countdowns on different phones and the GM screen match within about a second.
- [ ] **2.3** Tapping a name asks "Vote for X? You can't change it afterwards." Confirming shows **Vote recorded ✓ — You voted for X**.
- [ ] **2.4** Refreshing a phone that voted still shows **Vote recorded ✓**. One that didn't vote still shows the list.
- [ ] **2.5** Other phones show "Your team: N/4 voted", but **never who voted for whom**.
- [ ] **2.6** The GM screen shows live bars per team and a "Not voted:" list. The TM page shows "Still to vote: …" with names only.
- [ ] **2.7** The ghost from 1.5 sees "Ghosts can't vote".
- [ ] **2.8** The 💀 buttons are gone on the TM page and the GM list while voting is open (kills are paused until the game resumes).

**Make the test results interesting:**

- On **Red**, have 3 players vote for Red's **impostor**, and the impostor votes for someone else.
- On **Blue**, make a **tie**: 1 vote for player A, 1 for player B, and the rest skip.

---

## 3. Predictions (optional for players)

- [ ] **3.1** On a Red phone, open **Predict other teams**. It explains the points (+30 / −15) and that it locks for the team.
- [ ] **3.2** Pick a Blue player and confirm. It shows "You predicted <name>".
- [ ] **3.3** A **different Red phone** now shows "<first person> predicted <name>" with a lock, and can't pick another Blue player.
- [ ] **3.4** Blue phones do **not** see Red's prediction.

---

## 4. Timer closes by itself

1. Let the 90 seconds run out **without pressing anything** on the GM screen.

- [ ] **4.1** Within a few seconds of 0:00, phones show "Voting is closed. Waiting for the hosts…" and the GM screen moves to **3 · Check results**.
- [ ] **4.2** A phone that hadn't voted can no longer vote.

---

## 5. Ties, overrides and reopening

- [ ] **5.1** The Blue card says "Tie — you decide who is ejected" with buttons for A, B and **Nobody**. **Reveal results** is disabled until you choose.
- [ ] **5.2** Press **Reopen voting +30s**. Phones that hadn't voted get the vote list back with a 30-second timer. Let it close again.
- [ ] **5.3** Break the Blue tie by choosing **A**. The card shows "Ejected: A (decided by <you>)".
- [ ] **5.4** The Red card shows the impostor ejected "(most votes)", with an **Overrule: nobody** button (don't press it).

---

## 6. Revealing results

1. Press **Reveal results** and confirm.

- [ ] **6.1** Every phone lists each team: Red "<impostor> **WAS AN IMPOSTOR**", Blue "A was not an impostor" (or impostor, if A really was).
- [ ] **6.2** Each phone shows its own team's vote counts (bars), skips and non-voters.
- [ ] **6.3** The TM page shows the ejected player for Red.

---

## 7. Confirming

1. Press **Confirm eliminations & award points**, type `CONFIRM` and confirm.

- [ ] **7.1** The ejected players' phones turn into the grey **ghost** view.
- [ ] **7.2** Red's score goes up by **30** (3 correct voters × 10). Blue gets nothing unless someone voted for Blue's real impostor.
- [ ] **7.3** Pressing **Confirm** again (e.g. on a second GM screen) does nothing more: no double points.
- [ ] **7.4** Press **Resume game**. Phones go back to normal (no meeting card). The **Meeting** page says "1/1 held".
- [ ] **7.5** Pressing **Call emergency meeting** again asks "Call another meeting?" (limit reached). Cancel it.

---

## 8. Fixing mistakes

1. Press **Call emergency meeting**, confirm the extra one, and **Open voting**.

- [ ] **8.1** A player votes. Under **Votes & predictions (GM only)** press 🗑 on their vote with a reason. That player gets the vote list back and can vote again.
- [ ] **8.2** Remove a prediction the same way. Their teammates can now predict that team again.
- [ ] **8.3** Press **Cancel meeting** with a reason. Phones return to normal, nobody is eliminated, and "held" doesn't go up.

---

## 9. Bad connection (optional)

- [ ] **9.1** Put a phone in airplane mode during voting, then turn it back on. It shows "Reconnecting…" then catches up with the right countdown.
- [ ] **9.2** Tap a vote while offline: it shows an error and **does not** say "Vote recorded". Tapping again once online works.

---

## Result

| | |
|---|---|
| Tester | |
| Date | |
| Phones and browsers used | |
| All boxes ticked? | ☐ Yes ☐ No (list failing step numbers below) |

Notes / failures:
