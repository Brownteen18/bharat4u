BHARAT4U
=========

A static site for podcasts, daily Indian news, and an "On This Day in Bharat's History" board. Includes EmailJS contact form and auto-enhanced content (news headlines, historical events, and YouTube videos for podcast cards).

Features
--------
- Auto-updating Indian news (The Hindu, Indian Express, NDTV) with 24h cache
- "On This Day" India-focused events from Wikipedia with 24h cache
- Podcast cards play relevant YouTube videos in a modal
- EmailJS contact form integration

Local Development
-----------------
Open `index.html` in a browser, or serve the folder with any static server.

Config
------
Set your EmailJS credentials in `src/main.js`:
- `EMAILJS_SERVICE_ID`
- `EMAILJS_TEMPLATE_ID`
- `EMAILJS_PUBLIC_KEY`

Deploy
------
Any static host works (GitHub Pages, Netlify, Vercel). For GitHub Pages, enable pages for the default branch and set root to `/`.

License
-------
MIT

