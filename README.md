# Local Anesthetic Calculator - PWA

Progressive Web App for peripheral nerve block dose calculations.

## Files
- `index.html` - Main application (single-file calculator)
- `manifest.json` - PWA configuration (app name, icons, display mode)
- `service-worker.js` - Offline support + auto-updates

## Features
✓ Install on phone like native app
✓ Works offline after first load
✓ Automatic updates when you push changes
✓ No app store required

## Deployment Options

### Option 1: GitHub Pages (RECOMMENDED)

**Why:** Free, version controlled, auto-deploy via git push

**Steps:**
1. Create new GitHub repo (e.g., `la-calculator`)
2. Push these 3 files to repo:
   ```bash
   git init
   git add index.html manifest.json service-worker.js
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/la-calculator.git
   git push -u origin main
   ```
3. Go to repo Settings → Pages
4. Source: Deploy from branch `main` → folder `/root`
5. Click Save
6. Wait 1-2 minutes
7. Your app is live at: `https://YOUR_USERNAME.github.io/la-calculator`

**To update:**
```bash
# Edit files locally
git add .
git commit -m "Update calculations"
git push
# Live in ~30 seconds
```

### Option 2: Vercel (Alternative)

**Why:** Faster deploys, custom domains easy

**Steps:**
1. Install Vercel CLI: `npm i -g vercel`
2. In project folder: `vercel`
3. Follow prompts
4. Auto-deployed on every git push

### Option 3: Netlify (Drag & Drop)

**Why:** Zero terminal commands

**Steps:**
1. Go to netlify.com
2. Drag folder into browser
3. Done - live URL instantly

## How Users Install

### iOS (Safari):
1. Open your URL
2. Tap Share icon
3. Tap "Add to Home Screen"
4. App appears on home screen

### Android (Chrome):
1. Open your URL
2. Tap "Install" banner (or menu → "Install app")
3. App appears in app drawer

## Auto-Updates

When you push changes:
- Service worker detects new version
- Updates cache automatically
- Users get latest version on next app open (within 24 hours max)

## Cache Version Control

To force immediate update for all users:
1. Edit `service-worker.js`
2. Change `CACHE_NAME` from `'la-calc-v1'` to `'la-calc-v2'`
3. Push changes

## Testing Locally

```bash
# Simple HTTP server
python -m http.server 8000
# or
npx serve
```

Then visit `http://localhost:8000`

**Note:** PWA features (install prompt, offline) only work on HTTPS in production.

## Customization

**Change app name/colors:**
Edit `manifest.json` - change `name`, `short_name`, `theme_color`

**Change cache strategy:**
Edit `service-worker.js` - currently uses "network first, cache fallback"

**Add custom icon:**
Replace the inline SVG icons in `manifest.json` with paths to real PNG files:
```json
"icons": [
  {
    "src": "icon-192.png",
    "sizes": "192x192",
    "type": "image/png"
  },
  {
    "src": "icon-512.png",
    "sizes": "512x512",
    "type": "image/png"
  }
]
```

## Distribution

Share the URL with colleagues:
- Works on any device with modern browser
- No login required
- No app store approval needed
- Updates pushed instantly to everyone

## File Size
Total: ~50KB (single page load)
Loads in <1 second on 3G

## Browser Support
✓ iOS Safari 11.3+
✓ Android Chrome 40+
✓ Desktop Chrome/Edge/Safari
✗ Internet Explorer (not supported)

## License
MIT - Use freely

---

**Questions?** The entire app is in `index.html` - all logic is plain JavaScript, easily readable and modifiable.
