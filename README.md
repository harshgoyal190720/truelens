# TruthLens MVP

TruthLens is a static, frontend-only fake news detection and spread visualization app built with:

- Vanilla HTML, CSS, JavaScript
- `sql.js` (SQLite in browser)
- `d3.js` force graph
- APIs: Google Fact Check, NewsAPI, NewsData, GNews, Linkpreview

## Project Structure

- `index.html` - main page structure
- `style.css` - full design system and animations
- `app.js` - API calls, scoring engine, UI rendering
- `graph.js` - D3 force-directed spread graph
- `db.js` - sql.js setup and history CRUD
- `config.js` - API key placeholders
- `assets/noise.svg` - texture overlay
- `assets/logo.svg` - app logo

## 1. Configure API Keys

Open `config.js` and replace placeholders:

```js
window.TRUTHLENS_CONFIG = {
  FACTCHECK_API_KEY: "YOUR_GOOGLE_FACTCHECK_KEY",
  NEWS_API_KEY: "YOUR_NEWSAPI_KEY",
  NEWSDATA_API_KEY: "YOUR_NEWSDATA_KEY",
  GNEWS_API_KEY: "YOUR_GNEWS_KEY",
  LINKPREVIEW_API_KEY: "YOUR_LINKPREVIEW_KEY",
};
```

## 2. Run Locally

You can open `index.html` directly, but a local server is better for consistent fetch behavior.

### Option A: Python

```bash
python -m http.server 5500
```

Open: `http://localhost:5500`

### Option B: VS Code Live Server

- Install Live Server extension
- Right-click `index.html` -> Open with Live Server

## 3. Deploy (No Build Step)

### Netlify (Fastest)

1. Go to [Netlify Drop](https://app.netlify.com/drop)
2. Drag the `TrueLens` folder
3. Get instant live URL

### Vercel

1. Push project to GitHub
2. Import repo in [Vercel](https://vercel.com/)
3. Framework preset: `Other`
4. Deploy

### GitHub Pages

1. Push project to a GitHub repo
2. Go to `Settings -> Pages`
3. Source: `Deploy from a branch`
4. Branch: `main` and folder `/ (root)`
5. Save and wait for publish URL

## 4. Demo Checklist (Hackathon)

- Add valid API keys in `config.js`
- Hard refresh browser (`Ctrl+F5`) after key updates
- Test both:
  - `Analyze` with a real headline
  - `Demo Mode` for guaranteed on-stage flow
- Confirm `Data Confidence` shows:
  - `LIVE DATA` for real API data
  - `DEMO DATA` when fallback mock data is used

## 5. Troubleshooting

### Keys not working

- Confirm placeholders in `config.js` are replaced
- Hard refresh (`Ctrl+F5`)
- Open browser devtools console for provider errors

### `Some providers failed` toast appears

- One or more APIs returned non-200
- Common causes:
  - invalid key
  - daily quota exhausted
  - provider temporary outage

### NewsAPI issues in deployed static site

NewsAPI free/dev plans can fail on hosted frontend due plan/CORS constraints.
If that happens:

- Keep `NewsData + GNews + Google Fact Check` active
- Treat NewsAPI as optional
- For production, route NewsAPI via a backend proxy/serverless function

### Score feels too low/high

Edit scoring weights in `app.js`:

- `scoreFromFactChecks(...)`
- `scoreFromSources(...)`
- `scoreFromSourceReputation(...)`
- `scoreFromHeuristics(...)`

### URL preview not loading

- Check Linkpreview key
- Some pages block scraping/metadata extraction
- Analyze still works using URL text if preview fails

## 6. Security Note

This is a static frontend app. API keys in `config.js` are public to anyone inspecting your site.

- Fine for hackathon/demo
- For production, move all key-based requests to backend endpoints
