# GAVEL UP — User Guide & Customization Instructions

Welcome to the **Gavel Up** orientation website for **SLIIT Gavel Club**!

This website is built with **Next.js**, **React**, and **Tailwind CSS**, designed for hosting on **Vercel**.

---

## 1. How to Update Event Details & Google Form Link

All event information, dates, times, contacts, and registration links are centralized in a single configuration file:
👉 `src/config/eventConfig.ts`

Open `src/config/eventConfig.ts` to customize:
- `date`: Change `"Date TBA (Coming Soon)"` to your confirmed date (e.g., `"December 5, 2026"`).
- `time`: Change `"Time TBA"` to your time (e.g., `"3:30 PM - 6:30 PM"`).
- `venue`: Change `"SLIIT Main Campus, Malabe"` to your room/auditorium.
- `googleFormUrl`: Replace `"https://docs.google.com/forms/d/e/your-form-id-here/viewform"` with your live Google Form link. All "Register Now" buttons across the website and navbar will automatically update!
- `countdownTarget`: Set to your event launch timestamp (e.g., `"2026-12-05T15:30:00+05:30"`).
- `contacts`: Update names, phone numbers, emails, and WhatsApp numbers for:
  - President
  - VP Membership
  - Assistant VP Membership

---

## 2. Among Us Sound Effects (Step-by-Step Instructions)

### Built-in Web Audio API:
The website already comes with a built-in **Web Audio API synthesizer** that plays Among Us-inspired terminal blips, emergency siren alarms, task completed chimes, and role reveal chords with **zero external files needed**!

### How to use original Among Us MP3 files (Optional):
If you want to use the game's actual audio files, the website is pre-configured to detect them automatically.

1. **Where to find them on the internet:**
   - **Myinstants (Instant MP3 downloads):**
     - Emergency Meeting Sound: [https://www.myinstants.com/en/search/?name=among+us+emergency](https://www.myinstants.com/en/search/?name=among+us+emergency)
     - Role Reveal / Start: [https://www.myinstants.com/en/search/?name=among+us+role](https://www.myinstants.com/en/search/?name=among+us+role)
     - Task Complete: [https://www.myinstants.com/en/search/?name=among+us+task](https://www.myinstants.com/en/search/?name=among+us+task)
     - Kill / Sabotage: [https://www.myinstants.com/en/search/?name=among+us+kill](https://www.myinstants.com/en/search/?name=among+us+kill)
   - **GitHub Game Asset Rips:**
     - Search GitHub for repositories with `among-us-sounds` or `among-us-audio`.
   - **Internet Archive:**
     - Search Archive.org for `Among Us Sound Effects Gamerip`.

2. **Save them into your project's `public/sounds/` folder:**
   Save the files with these exact names:
   - `public/sounds/emergency.mp3` (Emergency siren alarm)
   - `public/sounds/click.mp3` (Terminal button click)
   - `public/sounds/task.mp3` (Task completed two-tone chime)
   - `public/sounds/role_reveal.mp3` (Role reveal / Impostor sting)
   - `public/sounds/start.mp3` (Game start / whoosh sound)

The website will automatically play these files whenever they exist, and fallback seamlessly if they don't!

---

## 3. How to Host on Vercel

### Method A: Deploy via GitHub & Vercel Dashboard (Easiest)
1. Initialize git in your project (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial Gavel Up website"
   ```
2. Create a new repository on your GitHub account (e.g. `gavel-up`).
3. Push your code to GitHub:
   ```bash
   git remote add origin https://github.com/your-username/gavel-up.git
   git branch -M main
   git push -u origin main
   ```
4. Go to [vercel.com](https://vercel.com) and log in.
5. Click **"Add New..."** -> **"Project"**.
6. Import your `gavel-up` repository.
7. Vercel will automatically detect **Next.js**. Click **"Deploy"**!
8. In less than 60 seconds, your website will be live with a free `*.vercel.app` URL and automatic HTTPS!

### Method B: Deploy using Vercel CLI
1. Run:
   ```bash
   npx vercel
   ```
2. Follow the prompt instructions to log in and select default settings.

---

## 4. How to Test & Run Locally

To preview the website locally on your computer:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
