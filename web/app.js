/**
 * Avoid AI Writing — PWA App Logic
 */

(function () {
  'use strict';

  // DOM Elements
  const inputText = document.getElementById('input-text');
  const wordCount = document.getElementById('word-count');
  const charCount = document.getElementById('char-count');
  const contextSelect = document.getElementById('context-select');
  const sourceMode = document.getElementById('source-mode');
  const btnAnalyze = document.getElementById('btn-analyze');
  const btnClear = document.getElementById('btn-clear');
  const btnPaste = document.getElementById('btn-paste');
  const btnLoadFile = document.getElementById('btn-load-file');
  const btnDownload = document.getElementById('btn-download');
  const resultsSection = document.getElementById('results-section');
  const loading = document.getElementById('loading');
  const emptyState = document.getElementById('empty-state');
  const scoreValue = document.getElementById('score-value');
  const scoreFill = document.querySelector('.score-fill');
  const verdict = document.getElementById('verdict');
  const verdictDetail = document.getElementById('verdict-detail');
  const patternCount = document.getElementById('pattern-count');
  const severityBreakdown = document.getElementById('severity-breakdown');
  const issuesList = document.getElementById('issues-list');
  const categoryList = document.getElementById('category-list');
  const themeToggle = document.getElementById('theme-toggle');
  const installBtn = document.getElementById('install-btn');
  const pwaStatus = document.getElementById('pwa-status');

  // State
  let deferredPrompt = null;
  let currentResult = null;
  let currentText = '';

  // ─── Initialization ─────────────────────────────────────────────
  function init() {
    loadTheme();
    updateCounts();
    registerServiceWorker();
    setupEventListeners();
    setupPWA();
  }

  // ─── Theme ──────────────────────────────────────────────────────
  function loadTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
      updateThemeIcon(saved);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      document.documentElement.setAttribute('data-theme', 'light');
      updateThemeIcon('light');
    }
  }

  function updateThemeIcon(theme) {
    themeToggle.querySelector('.theme-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
  }

  // ─── PWA ────────────────────────────────────────────────────────
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('web/sw.js')
        .then(() => { pwaStatus.textContent = 'PWA ready (offline capable)'; })
        .catch(() => { pwaStatus.textContent = 'PWA mode (no SW)'; });
    } else {
      pwaStatus.textContent = 'Standard web mode';
    }
  }

  function setupPWA() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      installBtn.style.display = '';
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      installBtn.style.display = 'none';
      pwaStatus.textContent = 'App installed';
    });

    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        installBtn.style.display = 'none';
      }
    });
  }

  // ─── Event Listeners ────────────────────────────────────────────
  function setupEventListeners() {
    btnAnalyze.addEventListener('click', handleAnalyze);
    btnClear.addEventListener('click', handleClear);
    btnPaste.addEventListener('click', handlePaste);
    btnLoadFile.addEventListener('click', handleLoadFile);
    btnDownload.addEventListener('click', handleDownload);
    themeToggle.addEventListener('click', toggleTheme);
    inputText.addEventListener('input', updateCounts);

    // Keyboard shortcut: Ctrl+Enter to analyze
    inputText.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        handleAnalyze();
      }
    });
  }

  // ─── Input Handlers ─────────────────────────────────────────────
  function updateCounts() {
    const text = inputText.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    wordCount.textContent = `${words} words`;
    charCount.textContent = `${text.length} chars`;
  }

  function handleClear() {
    inputText.value = '';
    updateCounts();
    resultsSection.style.display = 'none';
    emptyState.style.display = '';
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        inputText.value = text;
        updateCounts();
      }
    } catch {
      // Fallback: focus textarea and tell user
      inputText.focus();
      alert('Please paste manually (Ctrl+V)');
    }
  }

  function handleLoadFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md,.text,.markdown';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        inputText.value = ev.target.result;
        updateCounts();
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // ─── Analysis ───────────────────────────────────────────────────
  function handleAnalyze() {
    const text = inputText.value.trim();
    if (!text) {
      inputText.focus();
      return;
    }

    currentText = text;
    loading.style.display = 'flex';
    resultsSection.style.display = 'none';
    emptyState.style.display = 'none';

    // Use setTimeout to let UI update before heavy computation
    setTimeout(() => {
      try {
        const result = runAnalysis(text);
        currentResult = result;
        renderResults(result);
        resultsSection.style.display = 'flex';
      } catch (err) {
        console.error('Analysis failed:', err);
        alert('Analysis failed: ' + err.message);
        emptyState.style.display = '';
      } finally {
        loading.style.display = 'none';
      }
    }, 50);
  }

  function runAnalysis(text) {
    const context = contextSelect.value;
    const sourceModeValue = sourceMode.value;
    const options = {
      context,
      sourceMode: sourceModeValue,
    };

    const analysis = AIDetector.analyzeText(text, options);
    return analysis;
  }

  // Map detector severity ('high'/'medium'/'low') to UI levels
  const SEVERITY_MAP = { high: 'critical', medium: 'warning', low: 'info' };

  // ─── Results Rendering ──────────────────────────────────────────
  function renderResults(result) {
    renderScore(result);
    renderIssues(result);
    renderCategories(result);
  }

  function renderScore(result) {
    const score = result.score || 0;
    const label = AIDetector.getLabel(score);
    const color = AIDetector.getColor(score);

    scoreValue.textContent = score;
    scoreFill.style.width = Math.min(score, 100) + '%';
    scoreFill.style.background = color;

    // Verdict — combine score, document classification, and confidence
    const docClass = result.document_classification || 'UNKNOWN';
    const probs = result.class_probabilities || {};
    const confidence = result.confidence_category || 'low';

    let verdictText, verdictDetailText;
    if (score < 10) {
      verdictText = '✅ Likely Human';
      verdictDetailText = `Label: ${label} · Confidence: ${confidence}`;
    } else if (score < 25) {
      verdictText = '⚠️ Mixed Signals';
      verdictDetailText = `Label: ${label} · Doc class: ${docClass} · Confidence: ${confidence}`;
    } else if (score < 50) {
      verdictText = '⚠️ Likely AI-Assisted';
      verdictDetailText = `Label: ${label} · Doc class: ${docClass} · Confidence: ${confidence}`;
    } else {
      verdictText = '🤖 Likely AI-Generated';
      verdictDetailText = `Label: ${label} · Doc class: ${docClass} · Confidence: ${confidence}`;
    }
    verdict.textContent = verdictText;
    verdictDetail.textContent = verdictDetailText;

    // Pattern count + severity breakdown
    const issues = result.issues || [];
    const stats = result.stats || {};
    patternCount.textContent = stats.patternCount ?? issues.length;

    const severityCounts = { critical: 0, warning: 0, info: 0 };
    issues.forEach((issue) => {
      const mapped = SEVERITY_MAP[issue.severity] || 'info';
      severityCounts[mapped] = (severityCounts[mapped] || 0) + 1;
    });

    const parts = [];
    if (severityCounts.critical) parts.push(`${severityCounts.critical} high`);
    if (severityCounts.warning) parts.push(`${severityCounts.warning} medium`);
    if (severityCounts.info) parts.push(`${severityCounts.info} low`);
    severityBreakdown.textContent = parts.join(' • ') || 'No patterns detected';
  }

  function renderIssues(result) {
    issuesList.innerHTML = '';
    const issues = result.issues || [];

    if (issues.length === 0) {
      issuesList.innerHTML = '<div class="issue-item info"><span class="issue-badge info">CLEAN</span><span class="issue-text">No AI writing patterns detected.</span></div>';
      return;
    }

    issues.slice(0, 50).forEach((issue) => {
      const typeLabel = AIDetector.TYPE_LABELS[issue.type] || issue.type;
      const sevMapped = SEVERITY_MAP[issue.severity] || 'info';
      const snippet = issue.text || '';
      const suggestion = issue.suggestion || '';

      const item = document.createElement('div');
      item.className = `issue-item ${sevMapped}`;
      // NOTE on XSS lint: all user-derived strings (typeLabel, snippet, suggestion)
      // pass through escapeHtml() before innerHTML. sevMapped is whitelisted.
      item.innerHTML = `
        <span class="issue-badge ${sevMapped}">${sevMapped}</span>
        <div class="issue-text">
          <span class="issue-type">${escapeHtml(typeLabel)}</span>
          ${snippet ? `<div class="issue-snippet">"${escapeHtml(truncate(snippet, 120))}"</div>` : ''}
          ${suggestion ? `<div class="issue-suggestion">💡 ${escapeHtml(suggestion)}</div>` : ''}
        </div>
      `;
      issuesList.appendChild(item);
    });

    if (issues.length > 50) {
      const more = document.createElement('div');
      more.className = 'issue-item';
      more.innerHTML = `<span class="issue-text" style="color:var(--text-dim)">… and ${issues.length - 50} more patterns</span>`;
      issuesList.appendChild(more);
    }
  }

  function renderCategories(result) {
    categoryList.innerHTML = '';
    const issues = result.issues || [];

    // Group by type
    const byType = {};
    issues.forEach((issue) => {
      byType[issue.type] = (byType[issue.type] || 0) + 1;
    });

    const sorted = Object.entries(byType).sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
      categoryList.innerHTML = '<div class="category-item"><span class="category-name">No categories triggered</span></div>';
      return;
    }

    sorted.forEach(([type, count]) => {
      const label = AIDetector.TYPE_LABELS[type] || type;
      const item = document.createElement('div');
      item.className = 'category-item';
      item.innerHTML = `
        <span class="category-name">${escapeHtml(label)}</span>
        <span class="category-count">${count}</span>
      `;
      categoryList.appendChild(item);
    });
  }

  // ─── Download Report ────────────────────────────────────────────
  function handleDownload() {
    if (!currentResult || !currentText) return;

    const report = generateReport(currentText, currentResult);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-writing-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function generateReport(text, result) {
    const lines = [];
    lines.push('═══════════════════════════════════════════════════');
    lines.push('  AVOID AI WRITING — DETECTION REPORT');
    lines.push(`  Date: ${new Date().toISOString()}`);
    lines.push(`  Context: ${contextSelect.value}`);
    lines.push(`  Source: ${sourceMode.value}`);
    lines.push('═══════════════════════════════════════════════════');
    lines.push('');
    lines.push(`AI Score: ${result.score}/100`);
    lines.push(`Label: ${AIDetector.getLabel(result.score)}`);
    lines.push(`Document classification: ${result.document_classification || 'UNKNOWN'}`);
    if (result.class_probabilities) {
      const p = result.class_probabilities;
      lines.push(`Probabilities: human=${(p.human*100).toFixed(1)}% mixed=${(p.mixed*100).toFixed(1)}% ai=${(p.ai*100).toFixed(1)}%`);
    }
    lines.push(`Confidence: ${result.confidence_category || 'low'}`);
    const stats = result.stats || {};
    if (stats.wordCount) lines.push(`Word count: ${stats.wordCount}`);
    lines.push(`Total patterns found: ${(result.issues || []).length}`);
    lines.push('');
    lines.push('───────────────────────────────────────────────────');
    lines.push('DETECTED PATTERNS');
    lines.push('───────────────────────────────────────────────────');

    (result.issues || []).forEach((issue, i) => {
      const typeLabel = AIDetector.TYPE_LABELS[issue.type] || issue.type;
      const severity = (issue.severity || 'unknown').toUpperCase();
      lines.push(`\n${i + 1}. [${severity}] ${typeLabel}`);
      if (issue.text) lines.push(`   Text: "${issue.text}"`);
      if (issue.suggestion) lines.push(`   Suggestion: ${issue.suggestion}`);
    });

    lines.push('');
    lines.push('───────────────────────────────────────────────────');
    lines.push('ORIGINAL TEXT');
    lines.push('───────────────────────────────────────────────────');
    lines.push('');
    lines.push(text);

    return lines.join('\n');
  }

  // ─── Utilities ──────────────────────────────────────────────────
  function truncate(str, max) {
    return str.length > max ? str.slice(0, max) + '…' : str;
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Start
  init();
})();
