# Phase 1: Physical Test Checklist (Foundation)

**What Phase 1 covers:** registration, teams, player sessions, staff logins (Game Master / Team Manager), the live registration list, the registration QR code, and device-recovery codes.

**Time needed:** about 30 minutes.

**What you need:**

| Item                     | Purpose                                             |
| ------------------------ | --------------------------------------------------- |
| 1 laptop                 | Runs the site and acts as the **GM screen**         |
| 2–3 phones               | Act as **players** (Android and iPhone if possible) |
| 1 extra phone or browser | Acts as the **Team Manager**                        |

Tick each box as you go. If a step fails, write down the step number, what you expected, and what you saw (a screenshot helps).

---

## 0. Setup (one time)

### Option A: Local database (fastest, no Atlas needed)

1. In the project folder, open terminal #1 and run:
   ```
   npm run db:local
   ```
   Copy the `MONGODB_URI=...` line it prints.
2. Create a file called `.env.local` in the project folder:
   ```
   MONGODB_URI=<paste the URI from step 1>
   BOOTSTRAP_GM_NAME=Host One
   BOOTSTRAP_GM_PIN=123456
   ```
3. Open terminal #2 and run:
   ```
   npm run seed
   ```
   It should print `✔ Game GAVELUP26 ... active: true` and `✔ Game Master account: Host One`.
4. Start the site so phones on the same Wi-Fi can reach it:
   ```
   npm run dev:lan
   ```
5. Find your laptop's Wi-Fi IP address: run `ipconfig` and look for the **IPv4 Address**, for example `192.168.1.23`. Phones will open `http://192.168.1.23:3000`.
   - If phones can't connect, allow Node.js through the Windows Firewall on **private networks**.

### Option B: MongoDB Atlas

Same as Option A, but put your Atlas connection string in `MONGODB_URI` and skip step 1.

- [ ] **0.1** The seed command succeeds.
- [ ] **0.2** Running `npm run seed` a **second time** also succeeds and doesn't create duplicates.

---

## 1. The marketing site is unchanged

On the laptop, open `http://localhost:3000`.

- [ ] **1.1** The loading screen, navbar, footer, music button and all four pages (Home, About, Why Join, Contact) look and work exactly as before.
- [ ] **1.2** The "Register Now" buttons still go to the Google Form. That's intended for now.

---

## 2. Game Master login

1. Open `http://localhost:3000/gm`.

- [ ] **2.1** You are redirected to the **Staff access** login page.

2. Log in with name `host one` (lower case on purpose) and PIN `123456`.

- [ ] **2.2** You land on the **GM dashboard**. It shows game code `GAVELUP26`, phase **Setup**, "Registration is CLOSED", and 5 teams with 0 players.

3. Log out (top right), then try PIN `000000` five times.

- [ ] **2.3** The first 4 tries say "Wrong name or PIN". The 5th says "Too many wrong PINs". Even the correct PIN is now refused.
- [ ] **2.4** After about 5 minutes, the correct PIN works again.

---

## 3. Teams and staff setup (`/gm/setup`)

- [ ] **3.1** Rename "Purple" to "Violet" and press save. The name updates.
- [ ] **3.2** Change its colour to `pink`. The crewmate icon turns pink.
- [ ] **3.3** Add a team with colour `orange`. Six teams are now shown.
- [ ] **3.4** Delete the orange team (it's empty). It disappears.
- [ ] **3.5** **Add staff:** name `Red Manager`, role **Team Manager**, team **Red**, PIN `222222`. It appears in the list as `TM · Red`.
- [ ] **3.6** Try to deactivate **Host One** (the only GM). You get the error "You can't remove the last active Game Master".

> Rename the teams back to the real colours you'll use at the desk before moving on.

---

## 4. Registration QR code (`/gm/qr`)

- [ ] **4.1** A QR code is shown, with the URL `http://<host>:3000/play/register?g=GAVELUP26` under it.
  - The URL uses whatever address you opened the GM page with. **To test with phones, open the GM page via the IP address** (`http://192.168.1.23:3000/gm/qr`) so the QR code points to the IP, not `localhost`.
  - In production, set `PUBLIC_BASE_URL` (for example `https://your-site.vercel.app`) so the printed QR code is always correct.
- [ x ] **4.2** The **Print** button shows a clean, printable page (white background, no navigation).

---

## 5. Player registration (phones)

1. On the GM dashboard, press **Open registration**.

- [ ] **5.1** The status changes to **OPEN** and the phase changes to **Lobby · Registration**.

2. **Phone A:** scan the QR code from the laptop screen.

- [ ] **5.2** The **JOIN THE CREW** form opens and fits the phone screen without sideways scrolling.

3. Enter name `Nimal Perera`, phone `077 123 4567` (any real-looking number), and tap **RED**. Tap **Register**.

- [ ] **5.3** A confirmation pops up with a big red crewmate: "is RED the colour the desk gave you?"
- [ ] **5.4** After **Yes, join**, the player dashboard shows the name, the red crewmate, "Red team", and a **Stand by** card saying roles will be revealed soon.
- [ ] **5.5** **On the laptop**, the new registration appears in **Live registrations** within about 3 seconds, without refreshing. It's briefly highlighted and the Red count goes up.

4. **Phone B:** register as `Kamal Silva` on the **Blue** team.

- [ ] **5.6** Phone B appears on the GM screen. Phone A's team list does **not** show Kamal (different team).

5. **Phone B:** open the QR code again and try to register with **Phone A's number** (try typing it as `+94771234567`).

- [ ] **5.7** You get "This phone number is already registered…" with a **Log in with a code** link. No new row appears on the GM screen.

6. Form validation:

- [ ] **5.8** The name `A` is rejected. The phone `123` is rejected with "Enter a valid phone number". The **Register** button is disabled until a team is chosen.

---

## 6. Sessions survive refreshes and restarts

- [ ] **6.1** Phone A: pull down to refresh, close the browser tab, then reopen the site at `/play`. It's still logged in as Nimal.
- [ ] **6.2** Stop the dev server (Ctrl+C in terminal #2), run `npm run dev:lan` again, and refresh Phone A. It's still logged in. (The state lives in the database, not in the server.)
- [ ] **6.3** Phone A: open `/play/register` again. It says "You're already aboard" with a link to the dashboard.

---

## 7. Lost or new phone (device-recovery code)

1. **Phone C** (or a private/incognito window): open `http://<IP>:3000/play`.

- [ ] **7.1** It redirects to the registration page.

2. On the **laptop**, find Nimal in Live registrations and press **Code**.

- [ ] **7.2** A 6-digit code is shown in large digits, with an expiry time about 10 minutes away.

3. **Phone C:** go to `/play/recover`, enter Nimal's phone number and the code.

- [ ] **7.3** Phone C is now Nimal's dashboard.
- [ ] **7.4** **Phone A** (the old device) shows "You're not logged in" within a few seconds, or on its next refresh.
- [ ] **7.5** Enter the same code again on another browser. It's refused ("wrong or has expired").

---

## 8. Team Manager view

1. On the extra phone or browser, go to `/staff/login` and log in as `Red Manager` / `222222`.

- [ ] **8.1** It lands on **Team Manager**, showing **only the Red team** (Nimal), with no phone numbers.
- [ ] **8.2** **Code** works for Nimal.
- [ ] **8.3** Typing `/gm` in the address bar shows "Game Masters only". The TM can't open GM pages.

---

## 9. GM corrections

- [ ] **9.1** GM edits Kamal: change the name to `Kamal Silva Jr` and the team to Green. Kamal's phone updates to show the new name and team within a few seconds.
- [ ] **9.2** Register a junk entry from any phone (for example "Test Test"). GM removes it with the reason `test`. That phone shows "You're not logged in". The same phone number can register again.
- [ ] **9.3** Register two players with the same name, e.g. `Amal` (different phones). The GM list shows a **possible dup** tag on both.

---

## 10. Closing registration and poor connectivity

- [ ] **10.1** GM presses **Close registration** and confirms. A new phone opening the QR link sees "Registration closed". Phones that are already registered keep working.
- [ ] **10.2** Turn on **airplane mode** on Phone A for 20 seconds. A **Reconnecting…** pill appears. Turn airplane mode off and the pill disappears within a few seconds, with no refresh needed.

---

## Result

|                          |                                              |
| ------------------------ | -------------------------------------------- |
| Tester                   |                                              |
| Date                     |                                              |
| Phones and browsers used |                                              |
| All boxes ticked?        | ☐ Yes ☐ No (list failing step numbers below) |

Notes / failures:
