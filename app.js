/* ================================================================
   CNI — College Notes Index
   "Quiet, Editorial, Fast" Architecture (2026)
   ================================================================ */

(() => {
  'use strict';

  // ——— Subject Metadata —————————————————————————————————————————
  const SUBJECT_METADATA = {
    "AIKRR": {
      fullName: "AI, Knowledge Representation & Reasoning",
      category: "AI & Data",
      categoryKey: "ai-ds"
    },
    "BCC": {
      fullName: "Business Communication & Critical Thinking",
      category: "Math & Theory",
      categoryKey: "math-theory"
    },
    "CAO": {
      fullName: "Computer Architecture & Organization",
      category: "Core CS",
      categoryKey: "cs-core"
    },
    "CN": {
      fullName: "Computer Networks",
      category: "Core CS",
      categoryKey: "cs-core"
    },
    "DBMS": {
      fullName: "Database Management Systems",
      category: "Core CS",
      categoryKey: "cs-core"
    },
    "DMGT": {
      fullName: "Discrete Mathematics & Graph Theory",
      category: "Math & Theory",
      categoryKey: "math-theory"
    },
    "DSA": {
      fullName: "Data Structures & Algorithms",
      category: "Core CS",
      categoryKey: "cs-core"
    },
    "DWM": {
      fullName: "Data Warehousing & Mining",
      category: "AI & Data",
      categoryKey: "ai-ds"
    },
    "FLA": {
      fullName: "Formal Languages & Automata Theory",
      category: "Math & Theory",
      categoryKey: "math-theory"
    },
    "MLA": {
      fullName: "Machine Learning & Applications",
      category: "AI & Data",
      categoryKey: "ai-ds"
    },
    "OOP(new)": {
      fullName: "Object Oriented Programming (Java/C++)",
      category: "Core CS",
      categoryKey: "cs-core"
    },
    "OS": {
      fullName: "Operating Systems",
      category: "Core CS",
      categoryKey: "cs-core"
    },
    "QC(new)": {
      fullName: "Quantum Computing",
      category: "AI & Data",
      categoryKey: "ai-ds"
    },
    "SEPM": {
      fullName: "Software Engineering & Project Management",
      category: "Core CS",
      categoryKey: "cs-core"
    }
  };

  // ——— State Store —————————————————————————————————─────────────
  let rawTree = {};
  let processedSubjects = [];
  let favorites = []; // Array of subject codes or file keys
  let activeFilter = "all";
  let searchQuery = "";
  let currentSort = "code-asc";
  let currentSubjectCode = null;
  let activeDetailTab = "units";
  let sessionToken = sessionStorage.getItem("cni_session_token") || "";

  // Telemetry Cache
  let telemetry = {
    views: 1,
    downloads: 0,
    previews: 0,
    searches: 0
  };

  // Ads Placement & Tracking Cache
  let activeAdsConfig = null;
  const recordedAdImpressions = new Set();

  // ——— Helper Utilities —————————————————————————————————————————
  function escHtml(str) {
    const map = { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" };
    return String(str || "").replace(/[&<>"']/g, c => map[c]);
  }

  function getFileExt(filename) {
    const m = String(filename).match(/\.([a-zA-Z0-9]+)$/);
    return m ? m[1].toUpperCase() : "FILE";
  }

  // Format file display name without altering actual file path
  function cleanDisplayName(name) {
    let clean = String(name || "");
    // Remove duplicate extensions like .docx.pdf in display
    clean = clean.replace(/\.(docx|doc|pptx|ppt)\.pdf$/i, ".pdf");
    // Remove raw underscores
    clean = clean.replace(/_/g, " ");
    // Clean redundant spacing
    clean = clean.replace(/\s+/g, " ").trim();
    return clean;
  }

  function cleanGroupTitle(key) {
    const lower = key.toLowerCase();
    if (lower.includes("pyq") || lower.includes("question")) return "Previous Year Papers (PYQs)";
    if (lower.includes("root_files")) return "General Resources & Handouts";
    let formatted = key.replace(/_/g, " ").replace(/\s+/g, " ").trim();
    return formatted.replace(/^unit\s+/i, "Unit ");
  }

  function showToast(message) {
    const stack = document.getElementById("toast-stack");
    if (!stack) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    stack.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
      toast.style.transition = "all 160ms ease";
      setTimeout(() => toast.remove(), 200);
    }, 2800);
  }

  // ——— Persistence Engine ——————————————————————————————————————
  function initStorage() {
    try {
      favorites = JSON.parse(localStorage.getItem("cni_favorites") || "[]");
    } catch(e) {
      favorites = [];
    }
    updateSavedCounter();

    // Theme setup with zero-flash fallback
    const savedTheme = localStorage.getItem("cni_theme") || 
      (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    document.documentElement.setAttribute("data-theme", savedTheme);
  }

  function saveFavorites() {
    try {
      localStorage.setItem("cni_favorites", JSON.stringify(favorites));
      updateSavedCounter();
    } catch(e) {}
  }

  function updateSavedCounter() {
    const pill = document.getElementById("saved-count-pill");
    if (!pill) return;
    if (favorites.length > 0) {
      pill.textContent = favorites.length;
      pill.style.display = "inline-block";
    } else {
      pill.style.display = "none";
    }
  }

  // ——— Process Directory Tree Data —————————————————─────────────
  function processTreeData(data) {
    const root = data.Files || data;
    const subjects = [];

    for (const code of Object.keys(root)) {
      const groupsData = root[code] || {};
      const meta = SUBJECT_METADATA[code] || {
        fullName: code,
        category: "General",
        categoryKey: "cs-core"
      };

      const groups = [];
      let totalFiles = 0;
      let hasPYQs = false;

      for (const groupKey of Object.keys(groupsData)) {
        const fileNames = Array.isArray(groupsData[groupKey]) ? groupsData[groupKey] : [];
        if (fileNames.length > 0) {
          const isPyq = groupKey.toLowerCase().includes("pyq") || groupKey.toLowerCase().includes("question");
          if (isPyq) hasPYQs = true;

          groups.push({
            key: groupKey,
            title: cleanGroupTitle(groupKey),
            isPyq,
            files: fileNames.map(name => ({
              rawName: name,
              displayName: cleanDisplayName(name),
              path: `Files/${code}/${groupKey}/${name}`,
              ext: getFileExt(name)
            }))
          });
          totalFiles += fileNames.length;
        }
      }

      // Sort: regular units first, PYQs at the end
      groups.sort((a, b) => {
        if (a.isPyq && !b.isPyq) return 1;
        if (!a.isPyq && b.isPyq) return -1;
        return a.title.localeCompare(b.title, undefined, { numeric: true });
      });

      subjects.push({
        code,
        fullName: meta.fullName,
        category: meta.category,
        categoryKey: meta.categoryKey,
        groups,
        totalFiles,
        totalUnits: groups.filter(g => !g.isPyq).length,
        hasPYQs
      });
    }

    // Default sort alphabetically
    subjects.sort((a, b) => a.code.localeCompare(b.code));
    return subjects;
  }

  // ——— Update Real Metadata In Hero —————————————————————————————
  function updateMetadataLine() {
    let unitsTotal = 0;
    let filesTotal = 0;

    processedSubjects.forEach(s => {
      unitsTotal += s.totalUnits;
      filesTotal += s.totalFiles;
    });

    const subCountEl = document.getElementById("meta-subjects-count");
    const unitCountEl = document.getElementById("meta-units-count");
    const fileCountEl = document.getElementById("meta-files-count");

    if (subCountEl) subCountEl.textContent = `${processedSubjects.length} subjects`;
    if (unitCountEl) unitCountEl.textContent = `${unitsTotal} units`;
    if (fileCountEl) fileCountEl.textContent = `${filesTotal} files`;
  }

  // ——— Render Subject Index View (Editorial 2-Column) ———————————
  function renderIndexView() {
    const grid = document.getElementById("subject-index-grid");
    const emptyState = document.getElementById("index-empty-state");
    const showingCount = document.getElementById("index-showing-count");
    if (!grid) return;

    let filtered = processedSubjects.filter(sub => {
      // Category filter
      if (activeFilter === "saved") {
        if (!favorites.includes(sub.code)) return false;
      } else if (activeFilter === "pyq") {
        if (!sub.hasPYQs) return false;
      } else if (activeFilter !== "all") {
        if (sub.categoryKey !== activeFilter) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const codeMatch = sub.code.toLowerCase().includes(q);
        const nameMatch = sub.fullName.toLowerCase().includes(q);
        const fileMatch = sub.groups.some(g =>
          g.files.some(f => f.displayName.toLowerCase().includes(q))
        );
        if (!codeMatch && !nameMatch && !fileMatch) return false;
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      if (currentSort === "code-asc") return a.code.localeCompare(b.code);
      if (currentSort === "files-desc") return b.totalFiles - a.totalFiles;
      if (currentSort === "popular") return b.totalUnits - a.totalUnits;
      return 0;
    });

    if (showingCount) {
      showingCount.textContent = `${filtered.length} of ${processedSubjects.length} subjects`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      return;
    } else {
      if (emptyState) emptyState.style.display = "none";
    }

    const cardsHtml = filtered.map(sub => {
      const isSaved = favorites.includes(sub.code);

      return `
        <article class="subject-entry" data-subject-code="${escHtml(sub.code)}">
          <div class="entry-top-row">
            <div class="entry-code-col">
              <div class="entry-code-line">
                <span class="entry-code">${escHtml(sub.code)}</span>
                <span class="entry-category-plain">· ${escHtml(sub.category)}</span>
              </div>
              <h3 class="entry-title">${escHtml(sub.fullName)}</h3>
            </div>
            <button class="entry-bookmark-btn ${isSaved ? 'saved' : ''}" data-bookmark-code="${escHtml(sub.code)}" aria-label="${isSaved ? 'Remove bookmark' : 'Bookmark subject'}">
              <span class="material-symbols-outlined">${isSaved ? 'bookmark' : 'bookmark_border'}</span>
            </button>
          </div>

          <div class="entry-bottom-row">
            <span class="entry-stats-quiet">${sub.totalUnits} units · ${sub.totalFiles} files</span>
            <div class="entry-actions-quiet">
              ${sub.hasPYQs ? `<a href="#/subject/${encodeURIComponent(sub.code)}?tab=pyqs" class="link-pyq">PYQs</a>` : ''}
              <a href="#/subject/${encodeURIComponent(sub.code)}" class="link-open-subject">
                <span>View</span>
                <span class="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>
          </div>
        </article>
      `;
    });

    // Slot B: In-Feed Subject Directory Card (quiet, editorial design)
    if (activeAdsConfig && activeAdsConfig.infeed && activeAdsConfig.infeed.enabled && activeAdsConfig.infeed.title) {
      const adCard = `
        <article class="infeed-ad-entry" id="infeed-ad-card">
          <div class="infeed-top-row">
            <div>
              <span class="ad-sponsor-badge-quiet">${escHtml(activeAdsConfig.infeed.sponsor || "Featured Resource")}</span>
              <h3 class="infeed-title">${escHtml(activeAdsConfig.infeed.title)}</h3>
            </div>
          </div>
          <p class="infeed-desc">${escHtml(activeAdsConfig.infeed.desc || "")}</p>
          <div class="infeed-bottom-row">
            <a href="${escHtml(activeAdsConfig.infeed.url || "#")}" target="_blank" rel="noopener noreferrer" class="btn-subtle" data-ad-slot="infeed">
              <span>${escHtml(activeAdsConfig.infeed.cta || "Access Resource")}</span>
              <span class="material-symbols-outlined">arrow_outward</span>
            </a>
          </div>
        </article>
      `;
      if (cardsHtml.length >= 2) {
        cardsHtml.splice(2, 0, adCard);
      } else {
        cardsHtml.push(adCard);
      }
      trackAdImpression("infeed");
    }

    grid.innerHTML = cardsHtml.join("");
  }

  // ——— Render Dedicated Subject Detail View —————————————————————
  function renderDetailView(code, targetTab = "units") {
    const sub = processedSubjects.find(s => s.code.toLowerCase() === code.toLowerCase());
    if (!sub) {
      window.location.hash = "#/";
      return;
    }

    currentSubjectCode = sub.code;
    activeDetailTab = targetTab;

    // Update Header and Metadata in Detail View
    document.getElementById("detail-breadcrumb-code").textContent = sub.code;
    document.getElementById("detail-code-badge").textContent = sub.code;
    document.getElementById("detail-category-tag").textContent = sub.category;
    document.getElementById("detail-subject-title").textContent = sub.fullName;
    document.getElementById("detail-meta-line").textContent = 
      `${sub.totalUnits} course units · ${sub.totalFiles} total files${sub.hasPYQs ? ' · Question papers ready' : ''}`;

    // Update Bookmark Button in Detail
    const isSaved = favorites.includes(sub.code);
    const bookmarkIcon = document.getElementById("detail-bookmark-icon");
    const bookmarkText = document.getElementById("detail-bookmark-text");
    if (bookmarkIcon) bookmarkIcon.textContent = isSaved ? "bookmark" : "bookmark_border";
    if (bookmarkText) bookmarkText.textContent = isSaved ? "Saved" : "Save";

    // Tab counts
    const pyqGroups = sub.groups.filter(g => g.isPyq);
    const unitGroups = sub.groups.filter(g => !g.isPyq);

    document.getElementById("tab-units-count").textContent = unitGroups.length;
    document.getElementById("tab-pyqs-count").textContent = pyqGroups.length;

    // Active tab button state
    const unitsTabBtn = document.getElementById("tab-units-btn");
    const pyqsTabBtn = document.getElementById("tab-pyqs-btn");
    if (unitsTabBtn && pyqsTabBtn) {
      unitsTabBtn.classList.toggle("active", activeDetailTab === "units");
      pyqsTabBtn.classList.toggle("active", activeDetailTab === "pyqs");
    }

    // Render file groups
    const contentArea = document.getElementById("detail-content-area");
    const activeGroups = activeDetailTab === "pyqs" ? pyqGroups : unitGroups;

    if (activeGroups.length === 0) {
      contentArea.innerHTML = `
        <div class="empty-state">
          <p class="empty-title">No ${activeDetailTab === 'pyqs' ? 'question papers' : 'units'} indexed yet</p>
          <p class="empty-desc">You can contribute papers directly to the repository on GitHub.</p>
        </div>
      `;
      return;
    }

    contentArea.innerHTML = activeGroups.map(group => `
      <section class="unit-section-block">
        <div class="unit-block-header">
          <h3 class="unit-block-title">${escHtml(group.title)}</h3>
          <span class="unit-block-count">${group.files.length} ${group.files.length === 1 ? 'file' : 'files'}</span>
        </div>
        <div class="files-list-table">
          ${group.files.map(file => `
            <div class="file-entry-row" data-file-path="${escHtml(file.path)}" data-file-name="${escHtml(file.displayName)}" data-sub-code="${escHtml(sub.code)}">
              <div class="file-entry-left">
                <span class="file-type-tag ${file.ext.toLowerCase()}">${escHtml(file.ext)}</span>
                <span class="file-display-name">${escHtml(file.displayName)}</span>
              </div>
              <div class="file-entry-actions">
                <button class="file-action-btn preview-action" data-action="preview" title="Preview document">
                  <span class="material-symbols-outlined">visibility</span>
                  <span>Preview</span>
                </button>
                <a href="${escHtml(file.path)}" download class="file-action-btn download-action" data-action="download" title="Download file">
                  <span class="material-symbols-outlined">download</span>
                  <span>Download</span>
                </a>
              </div>
            </div>
          `).join("")}
        </div>
      </section>
    `).join("");
  }

  // ——— Routing & Navigation Router ——————————————————————————————
  function handleRoute() {
    const hash = window.location.hash || "#/";
    const indexView = document.getElementById("view-index");
    const detailView = document.getElementById("view-detail");

    if (hash.startsWith("#/subject/")) {
      const parts = hash.slice(10).split("?");
      const subjectCode = decodeURIComponent(parts[0]);
      const params = new URLSearchParams(parts[1] || "");
      const tab = params.get("tab") || "units";

      if (indexView) indexView.style.display = "none";
      if (detailView) detailView.style.display = "block";
      window.scrollTo({ top: 0, behavior: "instant" });
      renderDetailView(subjectCode, tab);
    } else {
      currentSubjectCode = null;
      if (detailView) detailView.style.display = "none";
      if (indexView) indexView.style.display = "block";
      renderIndexView();
    }
  }

  // ——— Command Palette Engine (⌘K) —————————————————————————————
  function setupCommandPalette() {
    const palette = document.getElementById("command-palette");
    const triggerBtn = document.getElementById("command-search-btn");
    const input = document.getElementById("palette-input");
    const resultsContainer = document.getElementById("palette-results");
    const closeKey = document.getElementById("palette-close-key");

    let selectedIndex = 0;
    let currentResults = [];

    function openPalette() {
      if (!palette) return;
      palette.style.display = "flex";
      if (input) {
        input.value = "";
        input.focus();
        renderResults("");
      }
    }

    function closePalette() {
      if (!palette) return;
      palette.style.display = "none";
    }

    function renderResults(q) {
      const query = q.trim().toLowerCase();
      currentResults = [];

      if (!query) {
        // Show all subjects as default quick jump
        currentResults = processedSubjects.map(s => ({
          type: "subject",
          tag: s.code,
          title: s.fullName,
          context: `${s.totalUnits} units`,
          url: `#/subject/${encodeURIComponent(s.code)}`
        }));
      } else {
        // Match subjects
        processedSubjects.forEach(s => {
          if (s.code.toLowerCase().includes(query) || s.fullName.toLowerCase().includes(query)) {
            currentResults.push({
              type: "subject",
              tag: s.code,
              title: s.fullName,
              context: s.category,
              url: `#/subject/${encodeURIComponent(s.code)}`
            });
          }
          // Match files within subjects
          s.groups.forEach(g => {
            g.files.forEach(f => {
              if (f.displayName.toLowerCase().includes(query)) {
                currentResults.push({
                  type: "file",
                  tag: s.code,
                  title: f.displayName,
                  context: g.title,
                  path: f.path,
                  name: f.displayName
                });
              }
            });
          });
        });
      }

      currentResults = currentResults.slice(0, 30);
      selectedIndex = 0;

      if (currentResults.length === 0) {
        resultsContainer.innerHTML = `
          <div style="padding: 1.5rem; text-align: center; color: var(--text-faint); font-size: 0.85rem;">
            No results found for "${escHtml(q)}"
          </div>
        `;
        return;
      }

      resultsContainer.innerHTML = currentResults.map((item, idx) => `
        <div class="command-result-item ${idx === selectedIndex ? 'selected' : ''}" data-idx="${idx}">
          <div class="result-item-left">
            <span class="result-tag">${escHtml(item.tag)}</span>
            <span class="result-title">${escHtml(item.title)}</span>
          </div>
          <span class="result-context">${escHtml(item.context)}</span>
        </div>
      `).join("");
    }

    if (triggerBtn) triggerBtn.addEventListener("click", openPalette);
    if (closeKey) closeKey.addEventListener("click", closePalette);

    if (input) {
      input.addEventListener("input", (e) => {
        renderResults(e.target.value);
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          selectedIndex = (selectedIndex + 1) % Math.max(1, currentResults.length);
          updateSelectionHighlight();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          selectedIndex = (selectedIndex - 1 + currentResults.length) % Math.max(1, currentResults.length);
          updateSelectionHighlight();
        } else if (e.key === "Enter") {
          e.preventDefault();
          const item = currentResults[selectedIndex];
          if (item) {
            closePalette();
            if (item.type === "subject") {
              window.location.hash = item.url;
            } else if (item.type === "file") {
              openFilePreview(item.path, item.name, item.tag);
            }
          }
        }
      });
    }

    function updateSelectionHighlight() {
      const items = resultsContainer.querySelectorAll(".command-result-item");
      items.forEach((it, idx) => {
        it.classList.toggle("selected", idx === selectedIndex);
        if (idx === selectedIndex) it.scrollIntoView({ block: "nearest" });
      });
    }

    if (resultsContainer) {
      resultsContainer.addEventListener("click", (e) => {
        const itemEl = e.target.closest(".command-result-item");
        if (itemEl) {
          const idx = parseInt(itemEl.getAttribute("data-idx"), 10);
          const item = currentResults[idx];
          if (item) {
            closePalette();
            if (item.type === "subject") {
              window.location.hash = item.url;
            } else if (item.type === "file") {
              openFilePreview(item.path, item.name, item.tag);
            }
          }
        }
      });
    }

    // Global shortcut Ctrl+K / ⌘K and Escape
    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (palette && palette.style.display === "flex") {
          closePalette();
        } else {
          openPalette();
        }
      }
      if (e.key === "Escape") {
        if (palette && palette.style.display === "flex") closePalette();
        const previewModal = document.getElementById("preview-modal");
        if (previewModal && previewModal.style.display === "flex") previewModal.style.display = "none";
        const adminModal = document.getElementById("admin-modal");
        if (adminModal && adminModal.style.display === "flex") adminModal.style.display = "none";
      }
    });

    if (palette) {
      palette.addEventListener("click", (e) => {
        if (e.target === palette) closePalette();
      });
    }
  }

  // ——— Document Previewer Overlay ——————————————————————————————
  function openFilePreview(path, name, subjectCode) {
    const modal = document.getElementById("preview-modal");
    const titleEl = document.getElementById("preview-file-title");
    const badgeEl = document.getElementById("preview-file-badge");
    const tagEl = document.getElementById("preview-subject-tag");
    const body = document.getElementById("preview-frame-container");
    const downloadBtn = document.getElementById("preview-download-btn");
    const externalLink = document.getElementById("preview-external-link");

    if (!modal) return;

    const ext = getFileExt(name);
    if (titleEl) titleEl.textContent = name;
    if (badgeEl) badgeEl.textContent = ext;
    if (tagEl) tagEl.textContent = `${subjectCode} · Course Material`;
    if (externalLink) externalLink.href = path;

    // Track preview with server
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "preview", filename: name, subject: subjectCode })
    }).catch(() => {});

    if (ext === "PDF") {
      body.innerHTML = `<iframe class="preview-iframe" src="${encodeURI(path)}" title="Document viewer"></iframe>`;
    } else {
      body.innerHTML = `
        <div class="preview-fallback-box">
          <span class="material-symbols-outlined" style="font-size:2.5rem; color: var(--text-faint);">description</span>
          <p>Browser preview is direct for PDF documents. You can download or view this file in its native app.</p>
          <a href="${encodeURI(path)}" download class="btn-primary">
            <span class="material-symbols-outlined">download</span> Download File
          </a>
        </div>
      `;
    }

    if (downloadBtn) {
      downloadBtn.onclick = () => {
        const a = document.createElement("a");
        a.href = path;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        trackDownload(name, subjectCode);
      };
    }

    modal.style.display = "flex";
  }

  function trackDownload(name, subjectCode) {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "download", filename: name, subject: subjectCode })
    }).catch(() => {});
    showToast(`Downloading "${name}"`);
  }

  // ——— UI Event Delegation & Interaction Handlers ———————————————
  function setupEventDelegation() {
    // 1. Index grid events (Bookmark & View triggers)
    const indexGrid = document.getElementById("subject-index-grid");
    if (indexGrid) {
      indexGrid.addEventListener("click", (e) => {
        const bookmarkBtn = e.target.closest("[data-bookmark-code]");
        if (bookmarkBtn) {
          e.preventDefault();
          const code = bookmarkBtn.getAttribute("data-bookmark-code");
          const idx = favorites.indexOf(code);
          if (idx >= 0) {
            favorites.splice(idx, 1);
            showToast(`Removed ${code} from Saved`);
          } else {
            favorites.push(code);
            showToast(`Saved ${code}`);
          }
          saveFavorites();
          renderIndexView();
          return;
        }
      });
    }

    // 2. Detail view events (File row click for preview, download trigger, tab switch)
    const detailArea = document.getElementById("detail-content-area");
    if (detailArea) {
      detailArea.addEventListener("click", (e) => {
        const downloadAction = e.target.closest("[data-action='download']");
        if (downloadAction) {
          // Direct native download via <a> tag, log telemetry
          const row = downloadAction.closest(".file-entry-row");
          if (row) {
            trackDownload(row.getAttribute("data-file-name"), row.getAttribute("data-sub-code"));
          }
          return;
        }

        const previewAction = e.target.closest("[data-action='preview']");
        const fileRow = e.target.closest(".file-entry-row");
        if (previewAction || fileRow) {
          const row = fileRow;
          if (row) {
            openFilePreview(
              row.getAttribute("data-file-path"),
              row.getAttribute("data-file-name"),
              row.getAttribute("data-sub-code")
            );
          }
        }
      });
    }

    // 3. Detail tab switching
    const tabUnitsBtn = document.getElementById("tab-units-btn");
    const tabPyqsBtn = document.getElementById("tab-pyqs-btn");
    if (tabUnitsBtn && tabPyqsBtn) {
      tabUnitsBtn.addEventListener("click", () => {
        if (currentSubjectCode) {
          window.location.hash = `#/subject/${encodeURIComponent(currentSubjectCode)}?tab=units`;
        }
      });
      tabPyqsBtn.addEventListener("click", () => {
        if (currentSubjectCode) {
          window.location.hash = `#/subject/${encodeURIComponent(currentSubjectCode)}?tab=pyqs`;
        }
      });
    }

    // 4. Detail header bookmark toggle
    const detailBookmarkBtn = document.getElementById("detail-bookmark-btn");
    if (detailBookmarkBtn) {
      detailBookmarkBtn.addEventListener("click", () => {
        if (!currentSubjectCode) return;
        const idx = favorites.indexOf(currentSubjectCode);
        if (idx >= 0) {
          favorites.splice(idx, 1);
          showToast(`Removed ${currentSubjectCode} from Saved`);
        } else {
          favorites.push(currentSubjectCode);
          showToast(`Saved ${currentSubjectCode}`);
        }
        saveFavorites();
        renderDetailView(currentSubjectCode, activeDetailTab);
      });
    }

    // 5. Preview modal close
    const previewCloseBtn = document.getElementById("preview-close-btn");
    const previewModal = document.getElementById("preview-modal");
    if (previewCloseBtn && previewModal) {
      previewCloseBtn.addEventListener("click", () => {
        previewModal.style.display = "none";
      });
      previewModal.addEventListener("click", (e) => {
        if (e.target === previewModal) previewModal.style.display = "none";
      });
    }

    // 6. Category filters
    const filterChips = document.querySelectorAll(".filter-chip");
    filterChips.forEach(chip => {
      chip.addEventListener("click", () => {
        filterChips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        activeFilter = chip.getAttribute("data-filter");
        renderIndexView();
      });
    });

    // 7. Header Saved quick filter
    const headerSavedBtn = document.getElementById("filter-saved-btn");
    if (headerSavedBtn) {
      headerSavedBtn.addEventListener("click", () => {
        if (window.location.hash !== "#/") {
          window.location.hash = "#/";
        }
        const savedChip = document.querySelector(".filter-chip[data-filter='saved']");
        if (savedChip) savedChip.click();
      });
    }

    // 8. Inline Search Bar
    const inlineInput = document.getElementById("inline-search-input");
    const inlineClear = document.getElementById("inline-search-clear");
    if (inlineInput) {
      inlineInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        if (inlineClear) inlineClear.style.display = searchQuery ? "flex" : "none";
        renderIndexView();
      });
    }
    if (inlineClear && inlineInput) {
      inlineClear.addEventListener("click", () => {
        inlineInput.value = "";
        searchQuery = "";
        inlineClear.style.display = "none";
        renderIndexView();
        inlineInput.focus();
      });
    }

    // 9. Reset filter button
    const resetBtn = document.getElementById("reset-filter-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        activeFilter = "all";
        searchQuery = "";
        if (inlineInput) inlineInput.value = "";
        if (inlineClear) inlineClear.style.display = "none";
        filterChips.forEach(c => c.classList.remove("active"));
        const allChip = document.querySelector(".filter-chip[data-filter='all']");
        if (allChip) allChip.classList.add("active");
        renderIndexView();
      });
    }

    // 10. Sort dropdown
    const sortSelect = document.getElementById("sort-select");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        currentSort = e.target.value;
        renderIndexView();
      });
    }

    // 11. Theme toggle
    const themeBtn = document.getElementById("theme-toggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        const cur = document.documentElement.getAttribute("data-theme") || "dark";
        const next = cur === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("cni_theme", next);
      });
    }

    // 12. Scroll to top
    const scrollTopBtn = document.getElementById("scroll-to-top-btn");
    if (scrollTopBtn) {
      scrollTopBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    // 13. Ad Slot Click Telemetry
    document.addEventListener("click", (e) => {
      const adEl = e.target.closest("[data-ad-slot]");
      if (adEl) {
        const slot = adEl.getAttribute("data-ad-slot");
        trackAdClick(slot);
      }
    });
  }

  // ——— Public Ad Spaces & Monetization Engine ——————————————————
  function trackAdImpression(slot) {
    if (recordedAdImpressions.has(slot)) return;
    recordedAdImpressions.add(slot);
    fetch("/api/ads/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot, event: "impression" })
    }).catch(() => {});
  }

  function trackAdClick(slot) {
    fetch("/api/ads/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot, event: "click" })
    }).catch(() => {});
  }

  async function loadPublicAds() {
    try {
      const res = await fetch("/api/ads");
      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.data) {
          activeAdsConfig = json.data;
          renderPublicAds();
          if (!currentSubjectCode) {
            renderIndexView();
          }
        }
      }
    } catch(e) {}
  }

  function renderPublicAds() {
    if (!activeAdsConfig) return;

    // Slot A: Top Header Banner
    const topSlot = document.getElementById("ad-slot-top");
    if (topSlot) {
      if (activeAdsConfig.top && activeAdsConfig.top.enabled && activeAdsConfig.top.title) {
        topSlot.innerHTML = `
          <span class="ad-sponsor-badge-quiet">${escHtml(activeAdsConfig.top.sponsor || "Partner")}</span>
          <span>${escHtml(activeAdsConfig.top.title)}</span>
          <a href="${escHtml(activeAdsConfig.top.url || "#")}" target="_blank" rel="noopener noreferrer" class="ad-sponsor-link-quiet" data-ad-slot="top">
            <span>${escHtml(activeAdsConfig.top.cta || "Explore")}</span>
            <span class="material-symbols-outlined">arrow_outward</span>
          </a>
        `;
        topSlot.style.display = "flex";
        trackAdImpression("top");
      } else {
        topSlot.style.display = "none";
        topSlot.innerHTML = "";
      }
    }

    // Slot C: Bottom Footer Sponsor Line
    const bottomSlot = document.getElementById("ad-slot-bottom");
    if (bottomSlot) {
      if (activeAdsConfig.bottom && activeAdsConfig.bottom.enabled && activeAdsConfig.bottom.title) {
        bottomSlot.innerHTML = `
          <span class="ad-sponsor-badge-quiet">Sponsor</span>
          <span>${escHtml(activeAdsConfig.bottom.title)}</span>
          ${activeAdsConfig.bottom.url ? `
            <a href="${escHtml(activeAdsConfig.bottom.url)}" target="_blank" rel="noopener noreferrer" class="ad-sponsor-link-quiet" data-ad-slot="bottom">
              <span>Visit partner</span>
              <span class="material-symbols-outlined">arrow_outward</span>
            </a>
          ` : ''}
        `;
        bottomSlot.style.display = "flex";
        trackAdImpression("bottom");
      } else {
        bottomSlot.style.display = "none";
        bottomSlot.innerHTML = "";
      }
    }

    // Custom Script / AdSense
    const scriptSlot = document.getElementById("ad-slot-script");
    if (scriptSlot) {
      if (activeAdsConfig.customActive && activeAdsConfig.customCode) {
        scriptSlot.innerHTML = activeAdsConfig.customCode;
        scriptSlot.style.display = "block";
      } else {
        scriptSlot.style.display = "none";
        scriptSlot.innerHTML = "";
      }
    }
  }

  // ——— Quiet Admin Console Modal (Telemetry, Ads, Security) ────
  function setupAdminModal() {
    const footerLink = document.getElementById("footer-admin-link");
    const modal = document.getElementById("admin-modal");
    const closeBtn = document.getElementById("admin-modal-close");
    const authView = document.getElementById("admin-auth-view");
    const dashboardView = document.getElementById("admin-dashboard-view");
    const form = document.getElementById("admin-login-form");
    const pinField = document.getElementById("admin-pin-field");
    const errText = document.getElementById("admin-error-text");
    const demoBtn = document.getElementById("admin-demo-unlock");
    const logoutBtn = document.getElementById("admin-logout-btn");
    const exportTreeBtn = document.getElementById("admin-export-tree");

    // Admin Navigation Tabs
    const tabButtons = document.querySelectorAll(".admin-nav-tab");
    const panes = {
      analytics: document.getElementById("admin-pane-analytics"),
      ads: document.getElementById("admin-pane-ads"),
      security: document.getElementById("admin-pane-security")
    };

    let activeAdminTab = "analytics";

    function switchAdminTab(target) {
      activeAdminTab = target;
      tabButtons.forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-tab") === target);
      });
      Object.keys(panes).forEach(key => {
        if (panes[key]) {
          panes[key].classList.toggle("active", key === target);
        }
      });

      if (target === "analytics") {
        loadAnalyticsDashboard();
      } else if (target === "ads") {
        loadAdsManagement();
      } else if (target === "security") {
        const feedback = document.getElementById("password-feedback-msg");
        if (feedback) feedback.style.display = "none";
      }
    }

    tabButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        switchAdminTab(tab);
      });
    });

    function openModal() {
      if (!modal) return;
      modal.style.display = "flex";
      if (sessionToken) {
        authView.style.display = "none";
        dashboardView.style.display = "block";
        switchAdminTab(activeAdminTab);
      } else {
        authView.style.display = "block";
        dashboardView.style.display = "none";
        if (pinField) {
          pinField.value = "";
          pinField.focus();
        }
      }
    }

    function closeModal() {
      if (modal) modal.style.display = "none";
    }

    if (footerLink) footerLink.addEventListener("click", openModal);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });
    }

    if (demoBtn && pinField) {
      demoBtn.addEventListener("click", () => {
        pinField.value = "admin123";
        form.dispatchEvent(new Event("submit"));
      });
    }

    // Authenticate Form
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const pin = pinField.value.trim();
        if (errText) errText.style.display = "none";

        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin })
          });
          const data = await res.json();
          if (res.ok && data.ok) {
            sessionToken = data.token;
            sessionStorage.setItem("cni_session_token", sessionToken);
            authView.style.display = "none";
            dashboardView.style.display = "block";
            switchAdminTab("analytics");
          } else {
            if (errText) {
              errText.textContent = data.error || "Authentication failed";
              errText.style.display = "block";
            }
          }
        } catch(err) {
          if (pin === "admin123") {
            sessionToken = "local_demo";
            authView.style.display = "none";
            dashboardView.style.display = "block";
            switchAdminTab("analytics");
          }
        }
      });
    }

    // Lock Session
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Authorization": `Bearer ${sessionToken}` }
        }).catch(() => {});

        sessionToken = "";
        sessionStorage.removeItem("cni_session_token");
        authView.style.display = "block";
        dashboardView.style.display = "none";
        showToast("Admin session locked");
      });
    }

    // Export tree.json
    if (exportTreeBtn) {
      exportTreeBtn.addEventListener("click", () => {
        const fullTree = { Files: {} };
        processedSubjects.forEach(s => {
          fullTree.Files[s.code] = {};
          s.groups.forEach(g => {
            fullTree.Files[s.code][g.key] = g.files.map(f => f.rawName);
          });
        });
        const blob = new Blob([JSON.stringify(fullTree, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "tree.json";
        a.click();
        URL.revokeObjectURL(url);
        showToast("Exported tree.json");
      });
    }

    // ═══ TAB 1: ANALYTICS & INSIGHTS ═══
    async function loadAnalyticsDashboard() {
      try {
        const res = await fetch("/api/analytics");
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.data) {
            const d = json.data;
            document.getElementById("admin-stat-views").textContent = d.views || 0;
            document.getElementById("admin-stat-downloads").textContent = d.downloads || 0;
            document.getElementById("admin-stat-previews").textContent = d.previews || 0;
            document.getElementById("admin-stat-searches").textContent = d.searches || 0;

            // Populate Top Downloaded Notes Leaderboard
            const tbody = document.getElementById("admin-top-downloads-tbody");
            if (tbody) {
              const fileDownloads = d.fileDownloads || {};
              const entries = Object.entries(fileDownloads).sort((a, b) => b[1] - a[1]);
              if (entries.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-faint); padding:1rem;">No download events logged yet</td></tr>`;
              } else {
                tbody.innerHTML = entries.slice(0, 10).map(([filename, count]) => {
                  let matchedSub = "General";
                  for (const s of processedSubjects) {
                    for (const g of s.groups) {
                      if (g.files.some(f => f.displayName === filename || f.rawName === filename)) {
                        matchedSub = s.code;
                        break;
                      }
                    }
                  }
                  return `
                    <tr>
                      <td class="file-col">${escHtml(filename)}</td>
                      <td><span class="detail-code-badge" style="font-size:0.75rem;">${escHtml(matchedSub)}</span></td>
                      <td class="count-col">${count}</td>
                    </tr>
                  `;
                }).join("");
              }
            }
          }
        }
      } catch(e) {}

      // Security Audit Logs
      const auditBox = document.getElementById("admin-audit-logs");
      if (auditBox && sessionToken) {
        try {
          const res = await fetch("/api/security/audit", {
            headers: { "Authorization": `Bearer ${sessionToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.ok && data.auditLogs) {
              if (data.auditLogs.length === 0) {
                auditBox.innerHTML = `<div style="padding:0.75rem; color:var(--text-faint); text-align:center; font-size:0.8rem;">No audit logs yet.</div>`;
              } else {
                auditBox.innerHTML = data.auditLogs.slice(0, 20).map(log => `
                  <div class="audit-entry-row">
                    <span class="audit-time-txt">${new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span class="audit-action-tag">${escHtml(log.action)}</span>
                    <span style="color:var(--text-secondary); max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escHtml(log.details)}</span>
                  </div>
                `).join("");
              }
            }
          }
        } catch(e) {}
      }
    }

    // Export Analytics JSON
    const exportAnalyticsBtn = document.getElementById("admin-export-analytics-btn");
    if (exportAnalyticsBtn) {
      exportAnalyticsBtn.addEventListener("click", async () => {
        try {
          const res = await fetch("/api/analytics");
          const json = await res.json();
          const blob = new Blob([JSON.stringify(json.data || {}, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `cni-analytics-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
          showToast("Exported analytics report");
        } catch(e) {
          showToast("Failed to export analytics");
        }
      });
    }

    // Reset Analytics Counters
    const resetAnalyticsBtn = document.getElementById("admin-reset-analytics-btn");
    if (resetAnalyticsBtn) {
      resetAnalyticsBtn.addEventListener("click", async () => {
        if (confirm("Reset views, downloads, previews, and search counters to zero?")) {
          try {
            const res = await fetch("/api/analytics/reset", {
              method: "POST",
              headers: { "Authorization": `Bearer ${sessionToken}` }
            });
            if (res.ok) {
              showToast("Counters reset to zero");
              loadAnalyticsDashboard();
            } else {
              showToast("Failed to reset counters");
            }
          } catch(e) {}
        }
      });
    }

    // ═══ TAB 2: AD SPACES MANAGEMENT (A + B + C + AdSense) ═══
    async function loadAdsManagement() {
      try {
        const res = await fetch("/api/ads");
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.data) {
            activeAdsConfig = json.data;
            const a = activeAdsConfig;

            // Slot A: Top Header Banner
            const top = a.top || {};
            const adTopActive = document.getElementById("ad-top-active");
            if (adTopActive) adTopActive.checked = !!top.enabled;
            const adTopSponsor = document.getElementById("ad-top-sponsor");
            if (adTopSponsor) adTopSponsor.value = top.sponsor || "";
            const adTopTitle = document.getElementById("ad-top-title");
            if (adTopTitle) adTopTitle.value = top.title || "";
            const adTopCta = document.getElementById("ad-top-cta");
            if (adTopCta) adTopCta.value = top.cta || "";
            const adTopUrl = document.getElementById("ad-top-url");
            if (adTopUrl) adTopUrl.value = top.url || "";
            const topImp = document.getElementById("ad-top-stat-imp");
            if (topImp) topImp.textContent = top.impressions || 0;
            const topClicks = document.getElementById("ad-top-stat-clicks");
            if (topClicks) topClicks.textContent = top.clicks || 0;

            // Slot B: In-Feed Subject Directory Card
            const infeed = a.infeed || {};
            const adInfeedActive = document.getElementById("ad-infeed-active");
            if (adInfeedActive) adInfeedActive.checked = !!infeed.enabled;
            const adInfeedSponsor = document.getElementById("ad-infeed-sponsor");
            if (adInfeedSponsor) adInfeedSponsor.value = infeed.sponsor || "";
            const adInfeedTitle = document.getElementById("ad-infeed-title");
            if (adInfeedTitle) adInfeedTitle.value = infeed.title || "";
            const adInfeedDesc = document.getElementById("ad-infeed-desc");
            if (adInfeedDesc) adInfeedDesc.value = infeed.desc || "";
            const adInfeedCta = document.getElementById("ad-infeed-cta");
            if (adInfeedCta) adInfeedCta.value = infeed.cta || "";
            const adInfeedUrl = document.getElementById("ad-infeed-url");
            if (adInfeedUrl) adInfeedUrl.value = infeed.url || "";
            const infeedImp = document.getElementById("ad-infeed-stat-imp");
            if (infeedImp) infeedImp.textContent = infeed.impressions || 0;
            const infeedClicks = document.getElementById("ad-infeed-stat-clicks");
            if (infeedClicks) infeedClicks.textContent = infeed.clicks || 0;

            // Slot C: Bottom Footer Banner
            const bottom = a.bottom || {};
            const adBottomActive = document.getElementById("ad-bottom-active");
            if (adBottomActive) adBottomActive.checked = !!bottom.enabled;
            const adBottomTitle = document.getElementById("ad-bottom-title");
            if (adBottomTitle) adBottomTitle.value = bottom.title || "";
            const adBottomUrl = document.getElementById("ad-bottom-url");
            if (adBottomUrl) adBottomUrl.value = bottom.url || "";
            const bottomImp = document.getElementById("ad-bottom-stat-imp");
            if (bottomImp) bottomImp.textContent = bottom.impressions || 0;
            const bottomClicks = document.getElementById("ad-bottom-stat-clicks");
            if (bottomClicks) bottomClicks.textContent = bottom.clicks || 0;

            // Google AdSense / Custom Script
            const adCustomActive = document.getElementById("ad-custom-active");
            if (adCustomActive) adCustomActive.checked = !!a.customActive;
            const adCustomCode = document.getElementById("ad-custom-code");
            if (adCustomCode) adCustomCode.value = a.customCode || "";
          }
        }
      } catch(e) {}
    }

    const adsForm = document.getElementById("admin-ads-form");
    if (adsForm) {
      adsForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const updatedAds = {
          top: {
            enabled: document.getElementById("ad-top-active").checked,
            sponsor: document.getElementById("ad-top-sponsor").value.trim(),
            title: document.getElementById("ad-top-title").value.trim(),
            cta: document.getElementById("ad-top-cta").value.trim(),
            url: document.getElementById("ad-top-url").value.trim(),
            impressions: activeAdsConfig?.top?.impressions || 0,
            clicks: activeAdsConfig?.top?.clicks || 0
          },
          infeed: {
            enabled: document.getElementById("ad-infeed-active").checked,
            sponsor: document.getElementById("ad-infeed-sponsor").value.trim(),
            title: document.getElementById("ad-infeed-title").value.trim(),
            desc: document.getElementById("ad-infeed-desc").value.trim(),
            cta: document.getElementById("ad-infeed-cta").value.trim(),
            url: document.getElementById("ad-infeed-url").value.trim(),
            impressions: activeAdsConfig?.infeed?.impressions || 0,
            clicks: activeAdsConfig?.infeed?.clicks || 0
          },
          bottom: {
            enabled: document.getElementById("ad-bottom-active").checked,
            title: document.getElementById("ad-bottom-title").value.trim(),
            url: document.getElementById("ad-bottom-url").value.trim(),
            impressions: activeAdsConfig?.bottom?.impressions || 0,
            clicks: activeAdsConfig?.bottom?.clicks || 0
          },
          customActive: document.getElementById("ad-custom-active").checked,
          customCode: document.getElementById("ad-custom-code").value.trim()
        };

        try {
          const res = await fetch("/api/ads", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${sessionToken}`
            },
            body: JSON.stringify(updatedAds)
          });
          const json = await res.json();
          if (res.ok && json.ok) {
            activeAdsConfig = updatedAds;
            renderPublicAds();
            if (!currentSubjectCode) {
              renderIndexView();
            }
            showToast("Ad space settings saved");
          } else {
            showToast(json.error || "Failed to save ad settings");
          }
        } catch(err) {
          showToast("Network error saving ads");
        }
      });
    }

    // ═══ TAB 3: PASSWORD & SECURITY ═══
    const changePasswordForm = document.getElementById("admin-change-password-form");
    const passwordFeedback = document.getElementById("password-feedback-msg");

    if (changePasswordForm) {
      changePasswordForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const currPin = document.getElementById("admin-curr-password").value.trim();
        const newPin = document.getElementById("admin-new-password").value.trim();
        const confirmPin = document.getElementById("admin-confirm-password").value.trim();

        if (passwordFeedback) {
          passwordFeedback.style.display = "none";
          passwordFeedback.className = "admin-feedback-msg";
        }

        if (newPin !== confirmPin) {
          if (passwordFeedback) {
            passwordFeedback.textContent = "New passwords do not match. Please re-enter.";
            passwordFeedback.className = "admin-feedback-msg error";
            passwordFeedback.style.display = "block";
          }
          return;
        }

        if (newPin.length < 4) {
          if (passwordFeedback) {
            passwordFeedback.textContent = "New password must be at least 4 characters.";
            passwordFeedback.className = "admin-feedback-msg error";
            passwordFeedback.style.display = "block";
          }
          return;
        }

        try {
          const res = await fetch("/api/auth/change-pin", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${sessionToken}`
            },
            body: JSON.stringify({ currentPin: currPin, newPin })
          });
          const json = await res.json();
          if (res.ok && json.ok) {
            if (passwordFeedback) {
              passwordFeedback.textContent = "Password updated successfully with salted SHA-256 encryption.";
              passwordFeedback.className = "admin-feedback-msg success";
              passwordFeedback.style.display = "block";
            }
            document.getElementById("admin-curr-password").value = "";
            document.getElementById("admin-new-password").value = "";
            document.getElementById("admin-confirm-password").value = "";
            showToast("Admin password changed");
          } else {
            if (passwordFeedback) {
              passwordFeedback.textContent = json.error || "Failed to update password.";
              passwordFeedback.className = "admin-feedback-msg error";
              passwordFeedback.style.display = "block";
            }
          }
        } catch(err) {
          if (passwordFeedback) {
            passwordFeedback.textContent = "Network error while changing password.";
            passwordFeedback.className = "admin-feedback-msg error";
            passwordFeedback.style.display = "block";
          }
        }
      });
    }
  }

  // ——— Bootstrapper ————————————————————————————————————————————
  async function init() {
    initStorage();
    setupCommandPalette();
    setupEventDelegation();
    setupAdminModal();

    window.addEventListener("hashchange", handleRoute);

    try {
      const response = await fetch("tree.json?nocache=" + Date.now());
      if (!response.ok) throw new Error("Could not load tree.json");
      rawTree = await response.json();
      processedSubjects = processTreeData(rawTree);

      updateMetadataLine();
      handleRoute();
      loadPublicAds();
    } catch(err) {
      console.error("Initialization error:", err);
      showToast("Unable to load course materials");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();

