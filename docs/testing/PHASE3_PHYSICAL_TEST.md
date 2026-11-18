# Phase 3: Physical Test Checklist (Game Control)

**What Phase 3 covers:**

- tasks: create, reveal, complete, paired confirm, Team Manager checking
- kills and ghosts, and undoing a kill
- the Detective's question, logged by the GM
- announcements on phones
- team scores going up when tasks are done

**Time needed:** about 40 minutes.

**What you need:**

| Item | Purpose |
|---|---|
| 1 laptop | The **GM screen** |
| At least 6 phones or browser windows | Players: **3 on Red**, **3 on Blue**. Private/incognito windows count as separate players. |
| 1 extra browser | The **Team Manager** for Red |

**Before you start:**

1. Run the setup from Phase 1, step 0 (`npm run db:local`, `npm run seed`, `npm run dev:lan`).
2. In **Teams & Staff**, create a Team Manager `Red Manager` (PIN `222222`) for the **Red** team. Log in as them on the extra browser and open `/tm`.
3. Open registration, register the 6 players, and press **Reveal roles** (see Phase 2).
4. On the GM screen, press **Show names** in the Roles panel and note who the **Red detective** and the **Blue impostor** are. Press **Hide names** again.

Tick each box as you go. For any failure, note the step number, what you expected, and what happened.

---

## 1. Creating tasks

1. In the staff menu, open **Tasks**, then press **New task**.

- [ ] **1.1** Create an **Individual** task "Find someone born in your month", leaving points empty. It appears with **+10** and **hidden**.
- [ ] **1.2** Create a **Paired** task "Talk to your partner for 2 minutes", partners from **Other teams**. It shows **+15** and "Paired · other teams".
- [ ] **1.3** Create a **Team** task "Team photo" with 20 points, and tick **A Team Manager must check it**. It shows a **staff check** tag.
- [ ] **1.4** Create an **Activity** "Table topics" with 20 points.
- [ ] **1.5** A title of 1 letter is refused with a message. Points of 500 are refused.
- [ ] **1.6** No phone shows any task yet (they're all hidden).

---

## 2. Revealing and doing an individual task

1. On "Find someone born in your month", press **Reveal**, keep **Everyone**, then **Reveal now**.

- [ ] **2.1** The dialog says "6 new assignment(s)". The task shows **visible to players** and a progress bar "0/6 done".
- [ ] **2.2** Within about 4 seconds, every phone shows a **Tasks** card with the task and **+10**.
- [ ] **2.3** On one Red phone, press **Mark done**, then confirm. You hear the task sound (if sound is on), and it shows **Done · +10 for your team**.
- [ ] **2.4** The Red team score (on the phone's **Your team** card, the GM dashboard team tile and the TM page) goes up by **10**.
- [ ] **2.5** Tapping **Mark done** quickly twice on another phone still adds only **10** points.
- [ ] **2.6** On the Tasks page, expand the progress line. It lists the players and shows who's **done**.

---

## 3. Paired task (two phones must confirm)

1. Reveal "Talk to your partner" for **Everyone**.

- [ ] **3.1** Every phone shows a partner **from the other team**, with that team's colour dot.
- [ ] **3.2** Phone A presses **We did it** and confirms. It shows "Waiting for <partner> to confirm on their phone". **No points yet.**
- [ ] **3.3** Within a few seconds the partner's phone highlights the task in yellow: "<A> confirmed — confirm too".
- [ ] **3.4** The partner confirms. Both phones show **Done**, and **both** teams get **+15**.

---

## 4. Team task with Team Manager check

1. Reveal "Team photo" for **Everyone**.

- [ ] **4.1** All Red phones show it with "Team task — anyone in your team can complete it".
- [ ] **4.2** One Red player presses **Mark done**. Every Red phone shows "Waiting for a Team Manager to check it". The Red score does **not** change yet.
- [ ] **4.3** The Red TM page shows **Tasks to check** with "Team photo". The GM dashboard **Tasks** button shows a red "1 to check" badge.
- [ ] **4.4** The TM presses **Reject** with the reason "show us the photo". Red phones show "Not accepted: show us the photo" and a **Try again** button.
- [ ] **4.5** A Red player presses **Try again**. The TM presses **Approve**. Red phones show **Done** and Red gets **+20** exactly once.
- [ ] **4.6** A **Blue** TM (if you make one) never sees Red's tasks to check.

---

## 5. Activity

1. Reveal "Table topics".

- [ ] **5.1** Every phone shows it under "Activities — points given by staff", with **no** Done button.

---

## 6. Hiding a task

1. On the individual task, press **Hide** and confirm.

- [ ] **6.1** It disappears from every phone. The points already earned stay.
- [ ] **6.2** Press **Reveal** again: it comes back, and people who already finished it still show **Done**.

---

## 7. Kills and ghosts

1. On the Red TM page, press the 💀 button on a Red player, type a note, and confirm **Mark killed**.

- [ ] **7.1** That player's phone shows a grey **You're a ghost** card within a few seconds, and their crewmate picture is dead.
- [ ] **7.2** Their teammates' phones show them as **ghost** in **Your team**. The GM list shows a **ghost** tag.
- [ ] **7.3** The Red TM has **no** 💀 button for Blue players (Blue isn't shown on their page at all).
- [ ] **7.4** The ghost can still do a task (e.g. reveal a new individual task) and Red still gets the points.
- [ ] **7.5** On the GM dashboard, the ghost's row has a 💗 **Revive** button. The TM page doesn't. Revive needs a reason; after it, the phone goes back to normal.

---

## 8. Detective question

1. The **Red detective** walks up to you and asks: "Is <Blue impostor> an impostor?"
2. On the GM dashboard, press **Detective question**, choose the detective, search for the target and press **Record & show answer**.

- [ ] **8.1** The GM screen shows a big red **YES**.
- [ ] **8.2** The detective's role card (tap **Tap to view**) now shows "0 of 1 remaining" and "Is <name> an impostor? **YES**".
- [ ] **8.3** Trying again for the same detective is refused: "has used all 1 investigation(s)".
- [ ] **8.4** Choosing a crewmate as the "detective" is not possible (only detectives are listed). Asking about a crewmate (with a second detective, if you have one) gives **NO**.
- [ ] **8.5** Nobody else's phone shows anything about this question.

---

## 9. Announcements

1. On the GM dashboard, write "Snacks at the back table!" and press **Send**.

- [ ] **9.1** Every phone shows it at the top within a few seconds, with a sound if sound is on. The TM page shows it too.
- [ ] **9.2** Send "Red: meet at the stage" with **Red only** and **Alert (red)**. Only Red phones show it, in red. Android phones vibrate.
- [ ] **9.3** Send one with **Pin** ticked, then 6 more. The pinned one stays at the top.
- [ ] **9.4** Delete an announcement on the GM dashboard. It disappears from phones.

---

## 10. Refresh safety

- [ ] **10.1** Refresh a phone in the middle of a paired task. It still shows "Waiting for <partner>…".
- [ ] **10.2** Refresh the TM page. The tasks to check are still there.

---

## Result

| | |
|---|---|
| Tester | |
| Date | |
| Phones and browsers used | |
| All boxes ticked? | ☐ Yes ☐ No (list failing step numbers below) |

Notes / failures:
