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

## 2. Among Us Theme Music & Sound Effects

The website includes support for both ambient background music and game sound effects:

### Background Music (`main_theme.mp3`)
- The sound button in the Navbar is **muted initially**.
- When the user clicks the sound button, it un-mutes and plays the **Among Us Main Theme** continuously on a seamless loop (`loop = true`).
- Clicking it again pauses/mutes the music and sound effects.

### Sound Files in `public/sounds/`:
- `public/sounds/main_theme.mp3` (Continuous background theme music)
- `public/sounds/emergency.mp3` (Emergency siren alarm)
- `public/sounds/click.mp3` (Terminal button click)
- `public/sounds/task.mp3` (Task completed two-tone chime)
- `public/sounds/role_reveal.mp3` (Role reveal / Impostor sting)
- `public/sounds/start.mp3` (Game start / whoosh sound)

---

## 3. How to Get the Clean "Main Theme" Audio

The 6-minute YouTube video is a 4x repeat of the original 1-minute 26-second track. Here are the 2 easiest ways to get the clean MP3:

### Option A: Download via Cobalt Tools (Fast & No Ads)
1. Go to [https://cobalt.tools](https://cobalt.tools) (clean, open-source downloader).
2. Paste your YouTube link: `https://youtu.be/o7oKN3IkO4M`
3. Select **Audio** (MP3) and download.
4. Rename the downloaded file to:
   👉 `main_theme.mp3`
5. Move it into your project folder:
   👉 `public/sounds/main_theme.mp3`

*(Note: Even as a full-length file, the browser automatically loops it in the background at low memory footprint).*

### Option B: Trim to the Exact 1:26 Loop using ffmpeg (Mac Terminal)
If you downloaded the audio from YouTube to your Downloads folder:
```bash
ffmpeg -i ~/Downloads/AmongUsTheme.mp3 -t 01:26 -c copy "public/sounds/main_theme.mp3"
```
This produces a lightweight ~1.2 MB file that loops seamlessly.

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
