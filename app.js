(function () {
  const SENSATIONAL_TERMS = [
    "SHOCKING",
    "EXPOSED",
    "THEY DON'T WANT YOU TO KNOW",
    "BREAKING:",
    "BOMBSHELL",
    "SECRET",
    "PROOF",
  ];

  const DEMO_HEADLINE = "BREAKING: Secret lab exposed creating weather weapons to control elections";

  const state = {
    latestPreview: null,
    currentQuery: "",
  };

  const els = {
    claimInput: document.getElementById("claimInput"),
    analyzeBtn: document.getElementById("analyzeBtn"),
    demoBtn: document.getElementById("demoBtn"),
    previewCard: document.getElementById("previewCard"),
    resultsSection: document.getElementById("resultsSection"),
    scoreValue: document.getElementById("scoreValue"),
    scoreLabel: document.getElementById("scoreLabel"),
    gaugeArc: document.getElementById("gaugeArc"),
    scoreBreakdown: document.getElementById("scoreBreakdown"),
    dataConfidenceTag: document.getElementById("dataConfidenceTag"),
    factPanel: document.getElementById("factPanel"),
    spreadMeta: document.getElementById("spreadMeta"),
    apiMeta: document.getElementById("apiMeta"),
    historyTimeline: document.getElementById("historyTimeline"),
    clearHistoryBtn: document.getElementById("clearHistoryBtn"),
    toastHost: document.getElementById("toastHost"),
  };

  function isUrl(text) {
    try {
      const parsed = new URL(text.trim());
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  function showToast(message, tone = "warn") {
    const node = document.createElement("div");
    node.className = "toast";
    node.style.borderColor =
      tone === "danger" ? "rgba(255,68,68,0.45)" : tone === "safe" ? "rgba(68,255,153,0.45)" : "";
    node.textContent = message;
    els.toastHost.appendChild(node);
    setTimeout(() => {
      node.style.opacity = "0";
      node.style.transform = "translateX(120%)";
      setTimeout(() => node.remove(), 250);
    }, 4000);
  }

  function ratingTone(value) {
    const txt = (value || "").toLowerCase();
    if (txt.includes("false") || txt.includes("pants on fire")) return "danger";
    if (txt.includes("misleading") || txt.includes("partly")) return "warn";
    if (txt.includes("true") || txt.includes("correct")) return "safe";
    return "warn";
  }

  function renderPreviewCard(data) {
    if (!data) {
      els.previewCard.classList.add("hidden");
      return;
    }
    const image = data.image || "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=360&q=80";
    els.previewCard.innerHTML = `
      <img src="${image}" alt="URL preview image">
      <div>
        <h4>${escapeHtml(data.title || "Untitled source")}</h4>
        <p>${escapeHtml((data.description || "").slice(0, 180) || "Preview extracted from URL. Analyze to run credibility checks.")}</p>
      </div>
    `;
    els.previewCard.classList.remove("hidden");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  async function throwApiError(res, providerName) {
    let detail = "";
    try {
      const data = await res.json();
      detail = data?.message || data?.status || "";
    } catch {
      detail = "";
    }
    const base = `${providerName} failed (${res.status})`;
    throw new Error(detail ? `${base}: ${detail}` : base);
  }

  async function fetchUrlPreview(url) {
    const key = window.TRUTHLENS_CONFIG?.LINKPREVIEW_API_KEY;
    if (!key || key.includes("REPLACE_WITH")) return null;
    const endpoint = `https://api.linkpreview.net/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(url)}`;
    const res = await fetch(endpoint);
    if (!res.ok) await throwApiError(res, "Linkpreview");
    return res.json();
  }

  async function fetchFactChecks(query) {
    const key = window.TRUTHLENS_CONFIG?.FACTCHECK_API_KEY;
    if (!key || key.includes("REPLACE_WITH")) return [];
    const endpoint = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(
      query
    )}&key=${encodeURIComponent(key)}&languageCode=en`;
    const res = await fetch(endpoint);
    if (!res.ok) await throwApiError(res, "Google Fact Check");
    const data = await res.json();
    return data.claims || [];
  }

  async function fetchNews(query) {
    const key = window.TRUTHLENS_CONFIG?.NEWS_API_KEY;
    if (!key || key.includes("REPLACE_WITH")) return [];
    const endpoint = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
      query
    )}&language=en&pageSize=12&sortBy=relevancy&apiKey=${encodeURIComponent(key)}`;
    const res = await fetch(endpoint);
    if (!res.ok) await throwApiError(res, "NewsAPI");
    const data = await res.json();
    return data.articles || [];
  }

  async function fetchNewsData(query) {
    const key = window.TRUTHLENS_CONFIG?.NEWSDATA_API_KEY;
    if (!key || key.includes("REPLACE_WITH")) return [];
    const endpoint = `https://newsdata.io/api/1/latest?apikey=${encodeURIComponent(
      key
    )}&q=${encodeURIComponent(query)}&language=en&country=in`;
    const res = await fetch(endpoint);
    if (!res.ok) await throwApiError(res, "NewsData");
    const data = await res.json();
    return (data.results || []).map((item) => ({
      source: { name: item.source_name || item.source_id || "Unknown Source" },
      title: item.title || "Untitled",
      url: item.link || "",
      publishedAt: item.pubDate || "",
    }));
  }

  async function fetchGNews(query) {
    const key = window.TRUTHLENS_CONFIG?.GNEWS_API_KEY;
    if (!key || key.includes("REPLACE_WITH")) return [];
    const endpoint = `https://gnews.io/api/v4/search?q=${encodeURIComponent(
      query
    )}&lang=en&country=in&max=10&apikey=${encodeURIComponent(key)}`;
    const res = await fetch(endpoint);
    if (!res.ok) await throwApiError(res, "GNews");
    const data = await res.json();
    return (data.articles || []).map((item) => ({
      source: { name: item.source?.name || "Unknown Source" },
      title: item.title || "Untitled",
      url: item.url || "",
      publishedAt: item.publishedAt || "",
    }));
  }

  function mergeArticles(...groups) {
    const merged = groups.flat().filter(Boolean);
    const seen = new Set();
    const deduped = [];
    merged.forEach((article) => {
      const key = (article.url || article.title || "").toLowerCase().trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      deduped.push(article);
    });
    return deduped;
  }

  function scoreFromFactChecks(claims, notes) {
    let penalty = 0;
    claims.forEach((claim) => {
      const review = claim.claimReview?.[0];
      const rating = (review?.textualRating || "").toLowerCase();
      if (!rating) return;
      if (rating.includes("pants on fire") || rating.includes("false")) {
        penalty += 45;
        notes.push(`-45: Fact-check rating flagged as false`);
      } else if (rating.includes("misleading") || rating.includes("partly false")) {
        penalty += 33;
        notes.push(`-33: Fact-check rating flagged as misleading`);
      } else if (rating.includes("unproven") || rating.includes("unverified")) {
        penalty += 22;
        notes.push(`-22: Claim marked unverified`);
      } else if (rating.includes("true")) {
        penalty -= 8;
        notes.push(`+8: Verified true by fact-check`);
      }
    });
    return penalty;
  }

  function scoreFromSources(articles, notes) {
    const sources = new Set(
      articles
        .map((a) => a.source?.name)
        .filter(Boolean)
        .map((s) => s.toLowerCase())
    );
    const count = sources.size;
    if (count >= 8) {
      notes.push("+18: Wide source diversity");
      return -18;
    }
    if (count >= 5) {
      notes.push("+12: Strong source diversity");
      return -12;
    }
    if (count >= 3) {
      notes.push("+6: Moderate source diversity");
      return -6;
    }
    if (count === 2) {
      notes.push("0: Limited but corroborated source coverage");
      return 0;
    }
    if (count === 0) {
      notes.push("-8: No corroborating sources found");
      return 8;
    }
    notes.push("-4: Single-source coverage");
    return 4;
  }

  function scoreFromSourceReputation(articles, notes) {
    const TRUSTED = [
      "reuters",
      "associated press",
      "ap news",
      "bbc",
      "guardian",
      "nytimes",
      "wsj",
      "npr",
      "cnn",
      "the hindu",
      "indian express",
      "times of india",
      "hindustan times",
      "ndtv",
      "the wire",
      "deccan herald",
      "livemint",
      "business standard",
      "ani",
    ];
    const matched = new Set();
    articles.forEach((a) => {
      const name = (a.source?.name || "").toLowerCase();
      if (TRUSTED.some((t) => name.includes(t))) matched.add(name);
    });
    const bonus = Math.min(12, matched.size * 3);
    if (bonus > 0) notes.push(`+${bonus}: Reputable source signal`);
    return -bonus;
  }

  function scoreFromHeuristics(text, notes) {
    const upper = text.toUpperCase();
    let penalty = 0;
    SENSATIONAL_TERMS.forEach((term) => {
      if (upper.includes(term)) {
        const delta = term === "THEY DON'T WANT YOU TO KNOW" ? 10 : 6;
        penalty += delta;
        notes.push(`-${delta}: Sensational phrase "${term}"`);
      }
    });

    const letters = text.replace(/[^a-zA-Z]/g, "");
    const caps = letters.replace(/[^A-Z]/g, "");
    if (letters.length > 10) {
      const ratio = caps.length / letters.length;
      if (ratio > 0.7) {
        penalty += 8;
        notes.push("-8: Excessive ALL-CAPS ratio");
      } else if (ratio > 0.5) {
        penalty += 4;
        notes.push("-4: Elevated ALL-CAPS ratio");
      }
    }
    return penalty;
  }

  function calculateScore(claims, articles, text) {
    const notes = [];
    let score = 78;
    score -= scoreFromFactChecks(claims, notes);
    score -= scoreFromSources(articles, notes);
    score -= scoreFromSourceReputation(articles, notes);
    score -= scoreFromHeuristics(text, notes);
    if (!claims.length && articles.length >= 3) {
      score += 4;
      notes.push("+4: No adverse fact-check hit with broad coverage");
    }
    score = Math.max(0, Math.min(100, Math.round(score)));
    return { score, notes };
  }

  function generateMockArticles(query) {
    const now = Date.now();
    const sources = [
      "Reuters",
      "BBC News",
      "The Guardian",
      "Independent Blog Watch",
      "Global Daily",
      "AP News",
    ];
    return sources.map((source, idx) => ({
      source: { name: source },
      title: `${query} - coverage snapshot #${idx + 1}`,
      url: `https://example${idx}.com/story`,
      publishedAt: new Date(now - idx * 1000 * 60 * 45).toISOString(),
    }));
  }

  function generateMockClaims(query) {
    return [
      {
        text: query,
        claimReview: [
          {
            textualRating: "False",
            publisher: { name: "Demo Fact Monitor" },
            url: "https://example.com/demo-fact-check",
          },
        ],
      },
    ];
  }

  function labelForScore(score) {
    if (score <= 30) return "UNRELIABLE";
    if (score <= 60) return "QUESTIONABLE";
    return "CREDIBLE";
  }

  function gaugeColor(score) {
    if (score <= 30) return "#FF4444";
    if (score <= 60) return "#E8C547";
    return "#44FF99";
  }

  function animateScore(score) {
    const maxDash = 515;
    const targetDash = maxDash - (score / 100) * maxDash;
    els.gaugeArc.style.stroke = gaugeColor(score);

    const totalFrames = 45;
    let frame = 0;
    const start = 0;

    const timer = setInterval(() => {
      frame += 1;
      const progress = frame / totalFrames;
      const current = Math.round(start + (score - start) * progress);
      const dash = maxDash - (current / 100) * maxDash;
      els.scoreValue.textContent = String(current);
      els.gaugeArc.style.strokeDashoffset = String(dash);
      if (frame >= totalFrames) {
        clearInterval(timer);
        els.scoreValue.textContent = String(score);
        els.gaugeArc.style.strokeDashoffset = String(targetDash);
      }
    }, 18);

    els.scoreLabel.textContent = labelForScore(score);
    els.scoreLabel.style.color = gaugeColor(score);
  }

  function renderFacts(claims) {
    if (!claims.length) {
      els.factPanel.innerHTML = `
        <div class="empty-state">
          <div>
            <div style="font-size:1.3rem">🔎</div>
            <div>No fact-checks found - treat with caution.</div>
          </div>
        </div>
      `;
      return;
    }

    els.factPanel.innerHTML = claims
      .slice(0, 6)
      .map((c) => {
        const review = c.claimReview?.[0] || {};
        const tone = ratingTone(review.textualRating);
        const badgeClass = tone === "danger" ? "badge-danger" : tone === "safe" ? "badge-safe" : "badge-warn";
        return `
          <article class="fact-card">
            <div class="fact-top">
              <strong>${escapeHtml(review.publisher?.name || "Unknown Checker")}</strong>
              <span class="badge ${badgeClass}">${escapeHtml(review.textualRating || "Unrated")}</span>
            </div>
            <p>${escapeHtml(c.text || "No claim text provided.")}</p>
            <p><a href="${review.url || "#"}" target="_blank" rel="noopener noreferrer">Source link</a></p>
          </article>
        `;
      })
      .join("");
  }

  function renderBreakdown(lines) {
    els.scoreBreakdown.innerHTML = lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  }

  function renderHistory() {
    const items = window.HistoryDB.list();
    if (!items.length) {
      els.historyTimeline.innerHTML = `<li class="history-item"><div class="history-title">No local cases yet.</div></li>`;
      return;
    }
    els.historyTimeline.innerHTML = items
      .map(
        (it) => `
      <li class="history-item">
        <button class="history-load" data-history-id="${it.id}">
          <div class="history-title">${escapeHtml(it.query.slice(0, 78))}</div>
          <div class="history-score">Score ${it.score}</div>
          <div class="history-time">${new Date(it.created_at).toLocaleString()}</div>
        </button>
      </li>
    `
      )
      .join("");

    document.querySelectorAll(".history-load").forEach((button) => {
      button.addEventListener("click", () => {
        const id = Number(button.getAttribute("data-history-id"));
        const hit = items.find((entry) => entry.id === id);
        if (!hit) return;
        els.claimInput.value = hit.query;
        hydrateResult(hit.payload, hit.score, hit.query);
      });
    });
  }

  function revealResults() {
    els.resultsSection.classList.remove("hidden");
    document.querySelectorAll(".result-block").forEach((node) => {
      node.classList.remove("in");
      node.style.setProperty("--dly", `${node.getAttribute("data-stagger") || 0}ms`);
      requestAnimationFrame(() => node.classList.add("in"));
    });
  }

  function showSkeletons() {
    els.factPanel.innerHTML = `
      <div class="skeleton" style="height:72px;margin-top:8px"></div>
      <div class="skeleton" style="height:72px;margin-top:8px"></div>
      <div class="skeleton" style="height:72px;margin-top:8px"></div>
    `;
    els.scoreBreakdown.innerHTML = `
      <li><div class="skeleton" style="height:12px;width:90%"></div></li>
      <li><div class="skeleton" style="height:12px;width:82%"></div></li>
      <li><div class="skeleton" style="height:12px;width:86%"></div></li>
    `;
  }

  function hydrateResult(payload, score, queryText) {
    revealResults();
    animateScore(score);
    renderBreakdown(payload.notes || []);
    renderFacts(payload.claims || []);

    const spread = window.renderSpreadGraph(queryText, payload.articles || []);
    els.spreadMeta.textContent = `${spread.sourceCount} sources are covering this story across ${spread.countryCount} countries`;
    const providerCounts = payload.providerCounts || {};
    els.apiMeta.textContent = `NewsAPI: ${providerCounts.newsApi ?? 0} | Google Fact Check: ${
      providerCounts.googleFactCheck ?? (payload.claims || []).length
    }`;
    const demo = Boolean(payload.usedMockFallback);
    els.dataConfidenceTag.textContent = `DATA CONFIDENCE: ${demo ? "DEMO DATA" : "LIVE DATA"}`;
    els.dataConfidenceTag.classList.toggle("demo", demo);
  }

  async function maybePreviewFromInput() {
    const value = els.claimInput.value.trim();
    if (!isUrl(value)) {
      state.latestPreview = null;
      renderPreviewCard(null);
      return;
    }
    try {
      const preview = await fetchUrlPreview(value);
      state.latestPreview = preview;
      renderPreviewCard(preview);
    } catch (error) {
      state.latestPreview = null;
      renderPreviewCard(null);
      showToast("Preview could not be loaded for this URL.", "warn");
    }
  }

  async function runAnalysis(query, options = {}) {
    const { allowMockFallback = false } = options;
    if (!query.trim()) {
      showToast("Enter a headline or URL first.", "warn");
      return;
    }
    state.currentQuery = query;
    revealResults();
    showSkeletons();
    try {
      const searchText = isUrl(query) ? state.latestPreview?.title || query : query;
      const providerResults = await Promise.allSettled([
        fetchFactChecks(searchText),
        fetchNews(searchText),
        fetchNewsData(searchText),
        fetchGNews(searchText),
      ]);

      const claims = providerResults[0].status === "fulfilled" ? providerResults[0].value : [];
      const newsApiArticles = providerResults[1].status === "fulfilled" ? providerResults[1].value : [];
      const newsDataArticles = providerResults[2].status === "fulfilled" ? providerResults[2].value : [];
      const gnewsArticles = providerResults[3].status === "fulfilled" ? providerResults[3].value : [];

      const failed = providerResults
        .map((r, i) => ({ r, name: ["Google Fact Check", "NewsAPI", "NewsData", "GNews"][i] }))
        .filter((x) => x.r.status === "rejected");
      if (failed.length) {
        const summary = failed.map((f) => f.name).join(", ");
        showToast(`Some providers failed: ${summary}`, "warn");
        console.warn("Provider failures:", failed.map((f) => f.r.reason?.message || f.name));
      }
      const allArticles = mergeArticles(newsApiArticles, newsDataArticles, gnewsArticles);
      const safeArticles =
        allArticles.length || !allowMockFallback ? allArticles : generateMockArticles(searchText);
      const safeClaims =
        claims.length || !allowMockFallback || !searchText.toLowerCase().includes("breaking")
          ? claims
          : generateMockClaims(searchText);
      const usedMockFallback = allowMockFallback && (!allArticles.length || !claims.length);

      if (!allowMockFallback && !safeArticles.length && !safeClaims.length) {
        showToast("No external matches found. Add API keys or try a broader query.", "warn");
      }
      const { score, notes } = calculateScore(safeClaims, safeArticles, searchText);
      const payload = {
        claims: safeClaims,
        articles: safeArticles,
        notes,
        providerCounts: {
          newsApi: newsApiArticles.length,
          googleFactCheck: claims.length,
        },
        usedMockFallback,
      };
      hydrateResult(payload, score, searchText);
      window.HistoryDB.add({
        query: searchText,
        score,
        payload,
        created_at: new Date().toISOString(),
      });
      renderHistory();
    } catch (error) {
      showToast("Analysis service failed. Check API keys or rate limits.", "danger");
      console.error(error);
    }
  }

  async function boot() {
    try {
      await window.HistoryDB.init();
      renderHistory();
    } catch (error) {
      showToast("Local history database failed to initialize.", "danger");
    }

    els.claimInput.addEventListener("blur", maybePreviewFromInput);
    els.claimInput.addEventListener("input", () => {
      if (!isUrl(els.claimInput.value.trim())) renderPreviewCard(null);
    });
    els.analyzeBtn.addEventListener("click", () => runAnalysis(els.claimInput.value.trim()));
    els.demoBtn.addEventListener("click", async () => {
      els.claimInput.value = DEMO_HEADLINE;
      state.latestPreview = null;
      renderPreviewCard(null);
      await runAnalysis(DEMO_HEADLINE, { allowMockFallback: true });
    });
    els.clearHistoryBtn.addEventListener("click", () => {
      window.HistoryDB.clear();
      renderHistory();
      showToast("Local history cleared.", "safe");
    });
  }

  boot();
})();
