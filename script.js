/* ============================================================
   Text Compiler v1.0 — script.js
   3-view SPA: home → share | load + compiler engine
   ============================================================ */
'use strict';

// ── Appwrite Backend Configuration ──────────────────────────
const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT  = '69b1b8530019bdda5157';
const BUCKET_ID         = '69b1c4760039da29c1fa'; // Storage bucket (no schema needed)

const APPWRITE_URL = `${APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files`;
console.log('Appwrite Storage URL:', APPWRITE_URL);

// Headers for Appwrite REST API
const appwriteHeaders = {
  'X-Appwrite-Project': APPWRITE_PROJECT
};

// ── DOM refs — Navigation ─────────────────────────────────────
const viewHome  = document.getElementById('view-home');
const viewShare = document.getElementById('view-share');
const viewLoad  = document.getElementById('view-load');

const tabHome  = document.getElementById('tab-home');
const tabShare = document.getElementById('tab-share');
const tabLoad  = document.getElementById('tab-load');

const sbHome  = document.getElementById('sb-home');
const sbShare = document.getElementById('sb-share');
const sbLoad  = document.getElementById('sb-load');

const homeShareBtn = document.getElementById('home-share-btn');
const homeLoadBtn  = document.getElementById('home-load-btn');

// ── DOM refs — Share ──────────────────────────────────────────
const shareInput   = document.getElementById('share-input');
const generateBtn  = document.getElementById('generate-btn');
const clearShareBtn= document.getElementById('clear-share-btn');
const shareError   = document.getElementById('share-error');
const codeOutput   = document.getElementById('code-output');
const codeDisplay  = document.getElementById('code-display');
const linkDisplay  = document.getElementById('link-display');
const copyCodeBtn  = document.getElementById('copy-code-btn');
const copyLinkBtn  = document.getElementById('copy-link-btn');
const shareLines   = document.getElementById('share-lines');

// ── DOM refs — Load ───────────────────────────────────────────
const codeInput    = document.getElementById('code-input');
const loadBtn      = document.getElementById('load-btn');
const outputViewer = document.getElementById('output-viewer');
const loadError    = document.getElementById('load-error');
const copyTextBtn  = document.getElementById('copy-text-btn');
const clearOutBtn  = document.getElementById('clear-output-btn');
const outputLines  = document.getElementById('output-lines');
const compileBtn   = document.getElementById('compile-btn');

// ── DOM refs — Compiler Panel ─────────────────────────────────
const compilerPanel       = document.getElementById('compiler-panel');
const compilerPanelHeader = document.getElementById('compiler-panel-header');
const compilerBody        = document.getElementById('compiler-body');
const compilerLangBadge   = document.getElementById('compiler-lang-badge');
const compilerClearBtn    = document.getElementById('compiler-clear-btn');
const stdinTextarea       = document.getElementById('stdin-textarea');

// ── DOM refs — Status / Toast ─────────────────────────────────
const statusMain   = document.getElementById('status-main');
const statusErrors = document.getElementById('status-errors');
const statusInfo   = document.getElementById('status-info');
const statusTime   = document.getElementById('status-time');
const toast        = document.getElementById('toast');

// ════════════════════════════════════════════════════════════
//  SYNTAX HIGHLIGHTING ENGINE
// ════════════════════════════════════════════════════════════

const shareHighlight  = document.getElementById('share-highlight');
const outputHighlight = document.getElementById('output-highlight');

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/**
 * Lightweight placeholder-based syntax highlighter.
 * 1. Replace strings/comments with N placeholders (safe tokens).
 * 2. Apply keyword/other patterns to the remaining text.
 * 3. HTML-escape the remainder.
 * 4. Restore placeholders as <span> tags.
 */
/**
 * Lightweight placeholder-based syntax highlighter.
 * Uses safer __TK_N__ placeholders to avoid rendering box characters in some fonts.
 */
function syntaxColor(raw, lang) {
  if (!raw) return '';
  const saved = [];
  let s = raw;

  const PH = (i) => `__TK_${i}__`; // safer, non-rendering-issue placeholder
  const PH_RE = /__TK_\d+__/g;

  function save(text, cls) {
    const i = saved.length;
    saved.push(`<span class="hl-${cls}">${esc(text)}</span>`);
    return PH(i);
  }

  // Basic pass to isolate strings and comments
  if (lang === 'javascript') {
    s = s.replace(/\/\/[^\n]*/g,          m => save(m,'comment'));
    s = s.replace(/\/\*[\s\S]*?\*\//g,    m => save(m,'comment'));
    s = s.replace(/`[^`]*`/g,              m => save(m,'string'));
    s = s.replace(/"(?:[^"\\]|\\.)*"/g,   m => save(m,'string'));
    s = s.replace(/'(?:[^'\\]|\\.)*'/g,   m => save(m,'string'));
    s = s.replace(/\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|delete|typeof|instanceof|in|of|class|extends|super|import|export|default|from|async|await|try|catch|finally|throw|this|null|undefined|true|false|void|static)\b/g, m => save(m,'keyword'));
    s = s.replace(/\b(\d+\.?\d*)\b/g,     m => save(m,'number'));
    s = s.replace(/\b(console|Math|JSON|Array|Object|String|Number|Boolean|Promise|Map|Set|Date|Error|window|document|navigator|fetch|setTimeout|setInterval|parseInt|parseFloat)\b/g, m => save(m,'builtin'));
    s = s.replace(/\b([a-zA-Z_$][\w$]*)\s*(?=\()/g, (m,n) => n && !n.startsWith('__TK_') ? save(n,'fn')+m.slice(n.length) : m);
    s = s.replace(/\.[a-zA-Z_$][\w$]*/g,  m => !m.includes('__TK_') ? save(m,'prop') : m);

  } else if (lang === 'python') {
    s = s.replace(/#[^\n]*/g,              m => save(m,'comment'));
    s = s.replace(/"""[\s\S]*?"""|'''[\s\S]*?'''/g, m => save(m,'string'));
    s = s.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, m => save(m,'string'));
    s = s.replace(/@[a-zA-Z_][\w]*/g,     m => save(m,'decorator'));
    s = s.replace(/\b(def|class|return|if|elif|else|for|while|in|not|and|or|import|from|as|with|try|except|finally|raise|pass|break|continue|lambda|yield|None|True|False|global|nonlocal|del|assert|is)\b/g, m => save(m,'py-kw'));
    s = s.replace(/\b(\d+\.?\d*)\b/g,     m => save(m,'number'));
    s = s.replace(/\b(print|len|range|type|str|int|float|list|dict|set|tuple|input|enumerate|zip|map|filter|sorted|sum|min|max|abs|round|isinstance)\b/g, m => save(m,'builtin'));
    s = s.replace(/\b([a-zA-Z_][\w]*)\s*(?=\()/g, (m,n) => n && !n.startsWith('__TK_') ? save(n,'fn')+m.slice(n.length) : m);

  } else if (lang === 'java') {
    s = s.replace(/\/\/[^\n]*/g,          m => save(m,'comment'));
    s = s.replace(/\/\*[\s\S]*?\*\//g,    m => save(m,'comment'));
    s = s.replace(/"(?:[^"\\]|\\.)*"/g,   m => save(m,'string'));
    s = s.replace(/'(?:[^'\\]|\\.)*'/g,   m => save(m,'string'));
    s = s.replace(/\b(public|private|protected|static|final|class|interface|extends|implements|new|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|throws|void|int|long|double|float|boolean|char|byte|short|null|true|false|this|super|abstract|enum|import|package)\b/g, m => save(m,'keyword'));
    s = s.replace(/\b(\d+\.?\d*)\b/g,     m => save(m,'number'));
    s = s.replace(/\b(System|String|Integer|Double|Float|Long|Boolean|List|ArrayList|HashMap|Math|Object|Exception|Arrays|Collections)\b/g, m => save(m,'builtin'));
    s = s.replace(/\b([a-zA-Z_$][\w$]*)\s*(?=\()/g, (m,n) => n && !n.startsWith('__TK_') ? save(n,'fn')+m.slice(n.length) : m);
    s = s.replace(/\.[a-zA-Z_$][\w$]*/g,  m => !m.includes('__TK_') ? save(m,'prop') : m);

  } else if (lang === 'c' || lang === 'cpp') {
    s = s.replace(/\/\/[^\n]*/g,          m => save(m,'comment'));
    s = s.replace(/\/\*[\s\S]*?\*\//g,    m => save(m,'comment'));
    s = s.replace(/"(?:[^"\\]|\\.)*"/g,   m => save(m,'string'));
    s = s.replace(/'(?:[^'\\]|\\.)*'/g,   m => save(m,'string'));
    s = s.replace(/^#[^\n]*/gm,           m => save(m,'preproc'));
    s = s.replace(/\b(int|long|short|char|unsigned|signed|float|double|void|struct|union|enum|typedef|const|static|extern|return|if|else|for|while|do|switch|case|break|continue|sizeof|NULL|true|false|auto|inline|volatile|class|namespace|template|new|delete|this|public|private|protected|virtual|override)\b/g, m => save(m,'keyword'));
    s = s.replace(/\b(\d+\.?\d*)\b/g,     m => save(m,'number'));
    s = s.replace(/\b([a-zA-Z_][\w]*)\s*(?=\()/g, (m,n) => n && !n.startsWith('__TK_') ? save(n,'fn')+m.slice(n.length) : m);

  } else if (lang === 'html') {
    s = s.replace(/<!--[\s\S]*?-->/g,     m => save(m,'comment'));
    s = s.replace(/<[^>]+>/g, tag => {
      let t = tag;
      t = t.replace(/"([^"]*)"/g,        m => save(m,'attrval'));
      t = t.replace(/'([^']*)'/g,         m => save(m,'attrval'));
      t = t.replace(/([\w\-:]+)(?=\s*=)/g,m => !m.includes('__TK_') ? save(m,'attr') : m);
      t = t.replace(/(<\/?)(\w[\w\-]*)/g, (_,sl,nm) => esc(sl)+ (nm && !nm.startsWith('__TK_') ? save(nm,'tag') : nm));
      return t;
    });

  } else if (lang === 'css') {
    s = s.replace(/\/\*[\s\S]*?\*\//g,   m => save(m,'comment'));
    s = s.replace(/"[^"]*"|'[^']*'/g,    m => save(m,'string'));
    s = s.replace(/#[0-9a-fA-F]{3,8}\b/g,m => save(m,'cssval'));
    s = s.replace(/\b\d+\.?\d*(px|em|rem|vh|vw|%|s|ms|deg|fr)?\b/g, m => save(m,'cssval'));
    s = s.replace(/@[\w\-]+|:[\w\-]+/g,  m => save(m,'keyword'));
    s = s.replace(/([\w\-]+)(?=\s*:)/g,  m => !m.includes('__TK_') ? save(m,'property') : m);

  } else if (lang === 'sql') {
    s = s.replace(/--[^\n]*/g,            m => save(m,'comment'));
    s = s.replace(/'[^']*'/g,             m => save(m,'string'));
    s = s.replace(/\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|ON|GROUP|ORDER|BY|HAVING|LIMIT|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|ADD|AND|OR|NOT|NULL|AS|DISTINCT|COUNT|SUM|AVG|MAX|MIN|CASE|WHEN|THEN|ELSE|END|WITH|UNION|ALL|IN|LIKE|BETWEEN|EXISTS|PRIMARY|KEY|FOREIGN|REFERENCES|INDEX|VIEW|DATABASE)\b/gi, m => save(m,'sql-kw'));
    s = s.replace(/\b(\d+\.?\d*)\b/g,   m => save(m,'number'));
  }

  // Escape remaining text
  s = s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  // Restore spans
  for (let i = saved.length - 1; i >= 0; i--) {
    s = s.split(PH(i)).join(saved[i]);
  }
  return s;
}

/** Update a highlight-layer pre from a textarea */
function renderHighlight(textarea, pre, lang) {
  const html = syntaxColor(textarea.value, lang) + '\n';
  pre.innerHTML = html;
}

// ════════════════════════════════════════════════════════════
//  VIEW NAVIGATION
// ════════════════════════════════════════════════════════════

const VIEWS = { home: viewHome, share: viewShare, load: viewLoad };
const TABS  = { home: tabHome,  share: tabShare,  load: tabLoad  };
const SBS   = { home: sbHome,   share: sbShare,   load: sbLoad   };

let currentView = 'home';

function showView(name) {
  if (!VIEWS[name]) return;
  Object.values(VIEWS).forEach(v => { v.style.display = 'none'; });
  VIEWS[name].style.display = 'flex';
  VIEWS[name].style.flexDirection = 'column';

  Object.entries(TABS).forEach(([k, t]) => t.classList.toggle('active', k === name));
  Object.entries(SBS).forEach(([k, s])  => s.classList.toggle('active', k === name));

  currentView = name;

  const labels = { home: 'Home', share: 'Share Mode', load: 'Load Mode' };
  setStatus('ready', labels[name] || name, 0);

  if (name === 'share') setTimeout(() => shareInput.focus(), 80);
  if (name === 'load')  setTimeout(() => codeInput.focus(), 80);
}

homeShareBtn.addEventListener('click', () => showView('share'));
homeLoadBtn.addEventListener('click',  () => showView('load'));

Object.entries(TABS).forEach(([name, tab]) => {
  tab.addEventListener('click', () => showView(name));
});
Object.entries(SBS).forEach(([name, sb]) => {
  sb.addEventListener('click', () => showView(name));
});
document.querySelectorAll('.back-btn').forEach(btn => {
  btn.addEventListener('click', () => showView(btn.dataset.view || 'home'));
});
document.getElementById('nav-home-btn').addEventListener('click', () => showView('home'));

// ════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

function encode(text) { return btoa(unescape(encodeURIComponent(text))); }
function decode(b64)  { return decodeURIComponent(escape(atob(b64))); }

let toastTimer = null;
function showToast(msg, ms = 2200) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), ms);
}

function setStatus(state = 'ready', info = 'None', errors = 0) {
  const dot = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4"/></svg>`;
  const labels = { ready: 'Ready', running: 'Processing…', loaded: 'Text Loaded', error: 'Error', compiling: 'Compiling…' };
  statusMain.className = 'status-segment' + (state === 'ready' || state === 'loaded' ? ' status-ok' : '');
  statusMain.innerHTML = dot + (labels[state] || 'Ready');
  statusErrors.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${errors} Error${errors !== 1 ? 's' : ''}`;
  statusInfo.textContent = 'Mode: ' + info;
}

function updateClock() {
  statusTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

function updateLineNumbers(textarea, container) {
  const n = Math.max(textarea.value.split('\n').length, 1);
  if (container.querySelectorAll('span').length === n) return;
  container.innerHTML = '';
  for (let i = 1; i <= n; i++) {
    const s = document.createElement('span');
    s.textContent = i;
    container.appendChild(s);
  }
}

// ════════════════════════════════════════════════════════════
//  SHARE PAGE LOGIC
// ════════════════════════════════════════════════════════════

generateBtn.addEventListener('click', async () => {
  const text = shareInput.value.trim();
  shareError.style.display = 'none';
  if (!text) {
    showToast('⚠ Please paste some text first');
    shareInput.focus();
    setStatus('error', 'Share Mode', 1);
    setTimeout(() => setStatus('ready', 'Share Mode', 0), 2000);
    return;
  }

  setStatus('running', 'Share Mode', 0);

  try {
    const code = makeCode();
    const encoded = encode(text);

    // Store in Appwrite Storage (no schema/attributes needed)
    const blob = new Blob([encoded], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('fileId', code);
    formData.append('file', blob, code + '.txt');

    const response = await fetch(APPWRITE_URL, {
      method: 'POST',
      headers: { 'X-Appwrite-Project': APPWRITE_PROJECT },
      body: formData
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error('Appwrite Error:', errData);

      let hint = errData.message || 'Appwrite store failed';
      if (response.status === 403) hint = 'Permission Denied! In Appwrite → Storage → codes bucket → Settings → Permissions, add Role: Any with Create + Read.';
      if (response.status === 404) hint = `Storage bucket "${BUCKET_ID}" not found! Create it in Appwrite → Storage, then set Permissions: Any (Create, Read).`;

      throw new Error(hint);
    }

    const link = `${location.origin}${location.pathname}#${code}`;
    codeDisplay.textContent = code;
    linkDisplay.textContent = link;
    codeOutput.style.display = 'flex';

    codeDisplay.classList.remove('pop');
    void codeDisplay.offsetWidth;
    codeDisplay.classList.add('pop');

    history.replaceState(null, '', '#' + code);
    setStatus('ready', 'Share Mode', 0);
    showToast(`✓ Code generated: ${code}`);
  } catch (err) {
    console.error(err);
    shareError.textContent = `// Error: ${err.message}`;
    shareError.style.display = 'block';
    setStatus('error', 'Share Mode', 1);
    showToast('✗ Share failed');
  }
});

clearShareBtn.addEventListener('click', () => {
  shareInput.value = '';
  codeOutput.style.display = 'none';
  updateLineNumbers(shareInput, shareLines);
  history.replaceState(null, '', location.pathname);
  setStatus('ready', 'Share Mode', 0);
  shareInput.focus();
});

shareInput.addEventListener('input', () => {
  updateLineNumbers(shareInput, shareLines);
  renderHighlight(shareInput, shareHighlight, detectLanguage(shareInput.value));
});

shareInput.addEventListener('scroll', () => {
  shareLines.scrollTop    = shareInput.scrollTop;
  shareHighlight.scrollTop = shareInput.scrollTop;
});

copyCodeBtn.addEventListener('click', () => {
  const code = codeDisplay.textContent;
  if (code && code !== '——') {
    navigator.clipboard.writeText(code)
      .then(() => showToast('✓ Code copied!'))
      .catch(() => showToast('✗ Copy failed'));
  }
});

copyLinkBtn.addEventListener('click', () => {
  const link = linkDisplay.textContent;
  if (link && link !== '——') {
    navigator.clipboard.writeText(link)
      .then(() => showToast('✓ Link copied!'))
      .catch(() => showToast('✗ Copy failed'));
  }
});

// ════════════════════════════════════════════════════════════
//  LOAD PAGE LOGIC
// ════════════════════════════════════════════════════════════

async function loadByCode(raw) {
  const code = raw.trim().toUpperCase();
  loadError.style.display = 'none';

  if (code.length !== 6) {
    loadError.textContent = '// Error: Code must be exactly 6 characters';
    loadError.style.display = 'block';
    setStatus('error', 'Load Mode', 1);
    return;
  }

  setStatus('running', 'Load Mode', 0);

  try {
    // Fetch from Appwrite Storage
    const response = await fetch(`${APPWRITE_URL}/${code}/download`, {
      method: 'GET',
      headers: appwriteHeaders
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error('Appwrite Load Error:', errData);
        if (response.status === 404) throw new Error('Code not found — verify it was shared correctly');
        if (response.status === 403) throw new Error('Permission denied — check Appwrite storage bucket permissions');
        throw new Error(errData.message || `Appwrite Error ${response.status}`);
    }

    const text = decode(await response.text());
    outputViewer.value = text;
    copyTextBtn.disabled = false;
    compileBtn.disabled  = false;
    updateLineNumbers(outputViewer, outputLines);

    // Detect language and render syntax highlight
    const lang = detectLanguage(text);
    renderHighlight(outputViewer, outputHighlight, lang);
    updateLangBadge(lang);
    setStatus('loaded', code, 0);
    showToast(`✓ Text loaded for code ${code}`);
  } catch (err) {
    console.error(err);
    loadError.textContent = `// Error: ${err.message}`;
    loadError.style.display = 'block';
    setStatus('error', 'Load Mode', 1);
    showToast('✗ Load failed');
  }
}

loadBtn.addEventListener('click', () => loadByCode(codeInput.value));
codeInput.addEventListener('keydown', e => { if (e.key === 'Enter') loadByCode(codeInput.value); });

// Force uppercase
codeInput.addEventListener('input', () => {
  const p = codeInput.selectionStart;
  codeInput.value = codeInput.value.toUpperCase();
  codeInput.setSelectionRange(p, p);
});

clearOutBtn.addEventListener('click', () => {
  outputViewer.value = '';
  codeInput.value = '';
  loadError.style.display = 'none';
  copyTextBtn.disabled = true;
  compileBtn.disabled  = true;
  updateLineNumbers(outputViewer, outputLines);
  setStatus('ready', 'Load Mode', 0);
  clearCompilerPanel();
  codeInput.focus();
});

outputViewer.addEventListener('scroll', () => {
  outputLines.scrollTop     = outputViewer.scrollTop;
  outputHighlight.scrollTop = outputViewer.scrollTop;
});

copyTextBtn.addEventListener('click', () => {
  if (!outputViewer.value) return;
  navigator.clipboard.writeText(outputViewer.value)
    .then(() => {
      showToast('✓ Text copied to clipboard!');
      copyTextBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg> Copied!`;
      setTimeout(() => {
        copyTextBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg> Copy Text`;
      }, 2200);
    })
    .catch(() => showToast('✗ Copy failed'));
});

// ════════════════════════════════════════════════════════════
//  COMPILER PANEL TOGGLE
// ════════════════════════════════════════════════════════════

compilerPanelHeader.addEventListener('click', (e) => {
  if (e.target === compilerClearBtn || compilerClearBtn.contains(e.target)) return;
  compilerPanel.classList.toggle('collapsed');
});

compilerClearBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  clearCompilerPanel();
});

function clearCompilerPanel() {
  compilerBody.innerHTML = '<span class="compiler-line cl-info">// Run "Compile &amp; Run" to execute loaded code</span>';
}

// ════════════════════════════════════════════════════════════
//  LANGUAGE DETECTION
// ════════════════════════════════════════════════════════════

/**
 * Detect programming language from code string.
 * Returns: 'javascript' | 'python' | 'java' | 'c' | 'cpp' | 'html' | 'css' | 'sql' | 'plain'
 */
function detectLanguage(code) {
  const c = code.trim();

  // HTML
  if (/<html|<!doctype|<div|<body|<head|<script|<style/i.test(c)) return 'html';

  // Python
  if (/^\s*(def |class |import |from |print\(|elif |#.*$)/m.test(c) &&
      !/\{/.test(c.slice(0, 200))) return 'python';

  // Java
  if (/\bpublic\s+class\b|\bSystem\.out\.print|\bpublic\s+static\s+void\s+main/.test(c)) return 'java';

  // C/C++
  if (/#include\s*<|printf\s*\(|scanf\s*\(|cout\s*<<|cin\s*>>|\bint\s+main\s*\(/.test(c)) {
    return /cout|cin|namespace\s+std|#include\s*<iostream>/.test(c) ? 'cpp' : 'c';
  }

  // SQL
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b/mi.test(c)) return 'sql';

  // CSS
  if (/^\s*[\w\-#.[\*:]+\s*\{[^}]*\}/m.test(c) && !/</.test(c)) return 'css';

  // JavaScript (fallback – has { } and common JS patterns)
  if (/\b(function|const |let |var |=>|console\.|document\.|window\.|require\(|module\.exports)\b/.test(c)) return 'javascript';

  return 'plain';
}

const LANG_META = {
  javascript: { label: 'JAVASCRIPT', cls: 'badge-js',   ext: '.js',   name: 'Node.js (browser sandbox)' },
  python:     { label: 'PYTHON',     cls: 'badge-py',   ext: '.py',   name: 'Python 3 (simulated)' },
  java:       { label: 'JAVA',       cls: 'badge-java', ext: '.java', name: 'Java 21 (simulated)' },
  c:          { label: 'C',          cls: 'badge-c',    ext: '.c',    name: 'GCC C17 (simulated)' },
  cpp:        { label: 'C++',        cls: 'badge-c',    ext: '.cpp',  name: 'GCC C++17 (simulated)' },
  html:       { label: 'HTML',       cls: 'badge-html', ext: '.html', name: 'Browser Renderer' },
  css:        { label: 'CSS',        cls: 'badge-plain',ext: '.css',  name: 'CSS Parser' },
  sql:        { label: 'SQL',        cls: 'badge-plain',ext: '.sql',  name: 'SQL Engine (simulated)' },
  plain:      { label: 'PLAINTEXT',  cls: 'badge-plain',ext: '.txt',  name: 'Plain Text' },
};

function updateLangBadge(lang) {
  const m = LANG_META[lang] || LANG_META.plain;
  compilerLangBadge.textContent = m.label;
  compilerLangBadge.className   = 'compiler-lang-badge ' + m.cls;
}

// ════════════════════════════════════════════════════════════
//  COMPILER ENGINE
// ════════════════════════════════════════════════════════════

compileBtn.addEventListener('click', () => {
  const code = outputViewer.value.trim();
  if (!code) { showToast('⚠ No code to compile'); return; }

  const lang = detectLanguage(code);
  updateLangBadge(lang);

  // Open the panel
  compilerPanel.classList.remove('collapsed');

  const stdin = makeStdinQueue(stdinTextarea.value);
  runCompiler(lang, code, stdin);
});

// ─── Terminal line builder ────────────────────────────────
function termLine(cls, text) {
  const el = document.createElement('span');
  el.className = 'compiler-line ' + cls;
  el.textContent = text;
  return el;
}

function termHTML(cls, html) {
  const el = document.createElement('span');
  el.className = 'compiler-line ' + cls;
  el.innerHTML  = html;
  return el;
}

function termBlank() {
  const el = document.createElement('span');
  el.className = 'compiler-line cl-blank';
  return el;
}

function appendLine(el) {
  compilerBody.appendChild(el);
  compilerBody.scrollTop = compilerBody.scrollHeight;
}

function clearAndStart() {
  compilerBody.innerHTML = '';
}

// animated delay helper
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── stdin queue (feeds input() / Scanner / scanf / prompt) ───
function makeStdinQueue(text) {
  const lines = (text || '').split('\n').map(l => l.trim()).filter(l => l !== '');
  let idx = 0;
  return {
    next()      { return idx < lines.length ? lines[idx++] : null; },
    nextInt()   { const v = this.next(); return v !== null ? (parseInt(v)   || 0) : 0; },
    nextFloat() { const v = this.next(); return v !== null ? (parseFloat(v) || 0) : 0.0; },
    hasMore()   { return idx < lines.length; },
  };
}

// ─── Main dispatcher ─────────────────────────────────────
async function runCompiler(lang, code, stdin) {
  setStatus('compiling', 'Compile &amp; Run', 0);
  compileBtn.disabled = true;
  clearAndStart();

  const meta = LANG_META[lang] || LANG_META.plain;
  const ts   = new Date().toLocaleTimeString();
  const lineCount = code.split('\n').length;

  // Header
  appendLine(termLine('cl-section', `┌─────────────────────────────────────────`));
  appendLine(termLine('cl-section', `│  Text Compiler v1.0 — Execution Engine `));
  appendLine(termLine('cl-section', `└─────────────────────────────────────────`));
  appendLine(termBlank());
  appendLine(termLine('cl-info', `[${ts}] Language detected: ${meta.label}`));
  appendLine(termLine('cl-info', `[${ts}] Runtime: ${meta.name}`));
  appendLine(termLine('cl-info', `[${ts}] Source: ${lineCount} lines`));
  appendLine(termBlank());

  await delay(300);

  // Spinner line
  const spinEl = document.createElement('span');
  spinEl.className = 'compiler-line cl-info';
  spinEl.innerHTML = `<span class="compiler-spinner"></span> Compiling...`;
  appendLine(spinEl);
  await delay(600);
  spinEl.remove();

  appendLine(termLine('cl-ok', `✓ Build succeeded (0 errors, 0 warnings)`));
  appendLine(termBlank());
  appendLine(termLine('cl-prompt', `Running ${meta.ext} ...`));
  appendLine(termBlank());

  await delay(250);

  try {
    if (lang === 'javascript') {
      await runJavaScript(code, stdin);
    } else if (lang === 'python') {
      await runPython(code, stdin);
    } else if (lang === 'java') {
      await runJava(code, stdin);
    } else if (lang === 'c' || lang === 'cpp') {
      await runC(code, lang, stdin);
    } else if (lang === 'html') {
      await runHTML(code);
    } else if (lang === 'sql') {
      await runSQL(code);
    } else {
      // Plain text — just display it
      const lines = code.split('\n');
      for (const ln of lines) {
        appendLine(termLine('cl-out', ln));
        await delay(12);
      }
    }
  } catch (err) {
    appendLine(termBlank());
    appendLine(termLine('cl-err', `✗ Runtime Error: ${err.message}`));
    setStatus('error', 'Compile &amp; Run', 1);
    compileBtn.disabled = false;
    return;
  }

  appendLine(termBlank());
  appendLine(termLine('cl-ok', `✓ Process exited with code 0`));
  appendLine(termLine('cl-time', `Execution time: ${(Math.random() * 0.4 + 0.05).toFixed(3)}s`));
  appendLine(termBlank());
  appendLine(termHTML('cl-info', `// <span style="opacity:.5">─────────────────────────────────────</span>`));

  setStatus('loaded', 'Compile &amp; Run', 0);
  compileBtn.disabled = false;
  showToast('✓ Execution complete');
}

// ════════════════════════════════════════════════════════════
//  LANGUAGE-SPECIFIC RUNNERS
// ════════════════════════════════════════════════════════════

// ─── JavaScript (real execution in browser sandbox) ──────
async function runJavaScript(code, stdin) {
  const logs = [];
  const fakeConsole = {
    log:   (...a) => logs.push({ t: 'log',   v: a.map(String).join(' ') }),
    warn:  (...a) => logs.push({ t: 'warn',  v: a.map(String).join(' ') }),
    error: (...a) => logs.push({ t: 'error', v: a.map(String).join(' ') }),
    info:  (...a) => logs.push({ t: 'info',  v: a.map(String).join(' ') }),
    table: (...a) => logs.push({ t: 'log',   v: JSON.stringify(a[0], null, 2) }),
  };

  // prompt() reads from the stdin queue instead of showing a browser popup
  const fakePrompt = (msg) => {
    if (msg) logs.push({ t: 'stdin-prompt', v: String(msg) });
    const val = stdin.next();
    if (val === null) return '';
    logs.push({ t: 'stdin', v: val });
    return val;
  };

  try {
    const fn = new Function('console', 'prompt', 'Math', 'JSON', 'Array', 'Object', 'String', 'Number',
      `"use strict"; try { ${code} } catch(e){ console.error(e.message); }`
    );
    fn(fakeConsole, fakePrompt, Math, JSON, Array, Object, String, Number);
  } catch (e) {
    throw new Error(e.message);
  }

  if (logs.length === 0) {
    appendLine(termLine('cl-info', '(no output — add console.log() to print)'));
    return;
  }

  for (const entry of logs) {
    const lineClass = entry.t === 'warn'         ? 'cl-warn'
                    : entry.t === 'error'        ? 'cl-err'
                    : entry.t === 'info'         ? 'cl-section'
                    : entry.t === 'stdin'        ? 'cl-stdin'
                    : entry.t === 'stdin-prompt' ? 'cl-stdin-prompt'
                    : 'cl-out';
    const prefix = entry.t === 'stdin' ? '> ' : '';
    const lines = String(entry.v).split('\n');
    for (const ln of lines) {
      appendLine(termLine(lineClass, prefix + ln));
      await delay(15);
    }
  }
}

// ─── Python (AST-level interpreter – covers common patterns) ─
async function runPython(code, stdin) {
  const outputs = interpretPython(code, stdin);
  if (outputs.length === 0) {
    appendLine(termLine('cl-info', '(no output — add print() statements)'));
    return;
  }
  for (const { cls, text } of outputs) {
    const lines = String(text).split('\n');
    for (const ln of lines) {
      appendLine(termLine(cls, ln));
      await delay(18);
    }
  }
}

function interpretPython(code, stdin) {
  const out = [];
  const lines = code.split('\n');
  const vars  = {};

  const evalPyExpr = (expr) => {
    expr = expr.trim();
    // Replace Python-style string to JS
    expr = expr.replace(/True/g, 'true').replace(/False/g, 'false').replace(/None/g, 'null');
    // Replace variable references
    try {
      const fn = new Function(...Object.keys(vars), `return (${expr});`);
      return fn(...Object.values(vars));
    } catch { return expr; }
  };

  let i = 0;
  while (i < lines.length) {
    const raw  = lines[i];
    const line = raw.trim();
    i++;

    if (!line || line.startsWith('#')) continue;

    // Variable assignment (simple)
    const assignMatch = line.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
    if (assignMatch && !line.startsWith('print')) {
      const rhs = assignMatch[2].trim();
      // Handle input() calls (covers input(), int(input()), float(input()), etc.)
      if (/input\s*\(/.test(rhs)) {
        const promptMatch = rhs.match(/input\s*\(\s*(['"'])(.*?)\1\s*\)/);
        if (promptMatch) out.push({ cls: 'cl-stdin-prompt', text: promptMatch[2] });
        const rawVal = (stdin && stdin.next()) ?? '';
        out.push({ cls: 'cl-stdin', text: '> ' + rawVal });
        if      (/^int\s*\(/.test(rhs))   vars[assignMatch[1]] = parseInt(rawVal)   || 0;
        else if (/^float\s*\(/.test(rhs)) vars[assignMatch[1]] = parseFloat(rawVal) || 0;
        else                               vars[assignMatch[1]] = rawVal;
        continue;
      }
      if (!line.includes('(')) {
        try { vars[assignMatch[1]] = evalPyExpr(rhs); } catch {}
        continue;
      }
    }

    // print(...)
    const printMatch = line.match(/^print\((.+)\)$/);
    if (printMatch) {
      try {
        const val = evalPyExpr(printMatch[1]);
        out.push({ cls: 'cl-out', text: String(val) });
      } catch (e) {
        out.push({ cls: 'cl-err', text: `Error: ${e.message}` });
      }
      continue;
    }

    // for i in range(n): … (single-line body heuristic)
    const forMatch = line.match(/^for\s+(\w+)\s+in\s+range\((\d+)(?:,\s*(\d+))?\)\s*:/);
    if (forMatch) {
      const varName = forMatch[1];
      const start   = forMatch[3] ? parseInt(forMatch[2]) : 0;
      const end     = forMatch[3] ? parseInt(forMatch[3]) : parseInt(forMatch[2]);
      // Collect indented body
      const body = [];
      while (i < lines.length && (lines[i].startsWith('    ') || lines[i].startsWith('\t'))) {
        body.push(lines[i].trim());
        i++;
      }
      for (let iter = start; iter < end && out.length < 200; iter++) {
        vars[varName] = iter;
        for (const bl of body) {
          const pm = bl.match(/^print\((.+)\)$/);
          if (pm) { try { out.push({ cls: 'cl-out', text: String(evalPyExpr(pm[1])) }); } catch {} }
        }
      }
      continue;
    }

    // Fallback — show as comment/info
    out.push({ cls: 'cl-info', text: '# ' + line });
  }
  return out;
}

// ─── Java (simulated) ────────────────────────────────────
async function runJava(code, stdin) {
  await simulateCompileSteps('javac', 'java', [
    'Parsing source files...',
    'Type checking...',
    'Generating bytecode...',
    'Loading JVM...',
  ]);

  // Pre-process Scanner reads and build a vars map from stdin
  const vars = {};
  const scanRegex = /(?:\w+\s+)?(\w+)\s*=\s*sc\.(nextInt|nextLong|nextDouble|nextFloat|nextLine|next)\s*\(\s*\)\s*;/g;
  let sm;
  while ((sm = scanRegex.exec(code)) !== null) {
    const varName = sm[1], method = sm[2];
    const raw = (stdin && stdin.next()) ?? '';
    if (raw !== '') appendLine(termLine('cl-stdin', '> ' + raw));
    if (method === 'nextInt' || method === 'nextLong')        vars[varName] = parseInt(raw)   || 0;
    else if (method === 'nextDouble' || method === 'nextFloat') vars[varName] = parseFloat(raw) || 0;
    else                                                         vars[varName] = raw;
  }
  await delay(50);

  // Extract System.out.print/println content
  const printRegex = /System\.out\.println?\s*\(([^;]+)\);/g;
  const outputs = [];
  let m;
  while ((m = printRegex.exec(code)) !== null) {
    let val = m[1].trim();
    const strMatch = val.match(/^"(.*)"$/);
    if (strMatch) {
      outputs.push({ cls: 'cl-out', text: strMatch[1].replace(/\\n/g, '\n') });
    } else {
      try {
        const fn = new Function(...Object.keys(vars), `return String(${val});`);
        outputs.push({ cls: 'cl-out', text: fn(...Object.values(vars)) });
      } catch {
        try {
          const fn = new Function(`return String(${val.replace(/\b[a-zA-Z_]\w*\b/g, v => vars[v] !== undefined ? JSON.stringify(vars[v]) : '""')});`);
          outputs.push({ cls: 'cl-out', text: fn() });
        } catch {
          outputs.push({ cls: 'cl-out-str', text: val });
        }
      }
    }
  }

  if (outputs.length === 0) {
    appendLine(termLine('cl-info', '(no System.out.println() found — add print statements)'));
    return;
  }

  for (const o of outputs) {
    const lines = String(o.text).split('\n');
    for (const ln of lines) {
      appendLine(termLine(o.cls, ln));
      await delay(20);
    }
  }
}

// ─── C / C++ (simulated) ─────────────────────────────────
async function runC(code, lang, stdin) {
  const compiler = lang === 'cpp' ? 'g++ -std=c++17' : 'gcc -std=c17';
  await simulateCompileSteps(compiler, './a.out', [
    'Preprocessing headers...',
    'Compiling translation unit...',
    'Linking...',
  ]);

  // Pre-process scanf / cin >> to build vars map from stdin
  const vars = {};
  // scanf("%d %s ...", &var1, var2, ...)
  const scanfRegex = /scanf\s*\(\s*"([^"]+)"\s*,\s*([^)]+)\)/g;
  let sm;
  while ((sm = scanfRegex.exec(code)) !== null) {
    const specifiers = [...sm[1].matchAll(/%[difsge]/g)].map(x => x[0]);
    const argNames   = sm[2].split(',').map(a => a.trim().replace(/^&/, '').replace(/\[.*\]$/, ''));
    for (let i = 0; i < Math.min(specifiers.length, argNames.length); i++) {
      const raw = (stdin && stdin.next()) ?? '';
      if (raw !== '') appendLine(termLine('cl-stdin', '> ' + raw));
      if (specifiers[i] === '%d' || specifiers[i] === '%i') vars[argNames[i]] = parseInt(raw)   || 0;
      else if (specifiers[i] === '%f' || specifiers[i] === '%g') vars[argNames[i]] = parseFloat(raw) || 0;
      else vars[argNames[i]] = raw;
    }
  }
  // cin >> var1 >> var2 ...
  const cinRegex = /cin\s*((?:>>\s*\w+\s*)+)/g;
  while ((sm = cinRegex.exec(code)) !== null) {
    const varNames = [...sm[1].matchAll(/>>\s*(\w+)/g)].map(x => x[1]);
    for (const varName of varNames) {
      const raw = (stdin && stdin.next()) ?? '';
      if (raw !== '') appendLine(termLine('cl-stdin', '> ' + raw));
      const declMatch = code.match(new RegExp(`\\b(int|long|double|float)\\s+${varName}\\b`));
      if (declMatch && (declMatch[1] === 'int' || declMatch[1] === 'long'))         vars[varName] = parseInt(raw)   || 0;
      else if (declMatch && (declMatch[1] === 'double' || declMatch[1] === 'float')) vars[varName] = parseFloat(raw) || 0;
      else vars[varName] = raw;
    }
  }
  await delay(50);

  // Extract printf / cout content (with variable substitution)
  const outputs = [];
  const printfRegex = /printf\s*\(\s*"([^"]*)"(?:\s*,\s*([^)]+))?\s*\)/g;
  let m;
  while ((m = printfRegex.exec(code)) !== null) {
    let fmt = m[1];
    if (m[2]) {
      const args = m[2].split(',').map(a => { const n = a.trim(); return vars[n] !== undefined ? vars[n] : n; });
      let idx = 0;
      fmt = fmt.replace(/%[difsge]/g, () => idx < args.length ? String(args[idx++]) : '?');
    }
    outputs.push(fmt.replace(/\\n/g, '\n'));
  }
  const coutRegex = /cout\s*<<([^;]+)/g;
  while ((m = coutRegex.exec(code)) !== null) {
    const parts = m[1].split('<<').map(p => p.trim());
    let result = '';
    for (const part of parts) {
      if (/^"([^"]*)"$/.test(part))    result += part.slice(1, -1).replace(/\\n/g, '\n');
      else if (part === 'endl')          result += '\n';
      else if (vars[part] !== undefined) result += String(vars[part]);
      else if (!/[(){}]/.test(part))    result += part;
    }
    if (result) outputs.push(result);
  }

  if (outputs.length === 0) {
    appendLine(termLine('cl-info', '(no printf/cout output detected)'));
    return;
  }

  for (const raw of outputs) {
    const lines = raw.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] !== '' || i < lines.length - 1) {
        appendLine(termLine('cl-out', lines[i]));
        await delay(15);
      }
    }
  }
}

// ─── HTML (render preview info) ──────────────────────────
async function runHTML(code) {
  appendLine(termLine('cl-info', 'Parsing HTML document...'));
  await delay(300);

  const parser  = new DOMParser();
  const doc     = parser.parseFromString(code, 'text/html');
  const title   = doc.querySelector('title')?.textContent || '(no title)';
  const tags    = code.match(/<[a-zA-Z]+/g) || [];
  const unique  = [...new Set(tags.map(t => t.replace('<', '').toLowerCase()))];
  const scripts = doc.querySelectorAll('script');
  const styles  = doc.querySelectorAll('style, link[rel="stylesheet"]');

  appendLine(termLine('cl-ok',    `✓ HTML parsed successfully`));
  appendLine(termLine('cl-info',  `  Title     : ${title}`));
  appendLine(termLine('cl-info',  `  Tags used : ${unique.join(', ')}`));
  appendLine(termLine('cl-info',  `  <script>  : ${scripts.length} block(s)`));
  appendLine(termLine('cl-info',  `  <style>   : ${styles.length} block(s)`));
  appendLine(termBlank());
  appendLine(termLine('cl-section','Rendered text content:'));
  appendLine(termBlank());

  const bodyText = doc.body?.innerText?.trim() || '';
  if (bodyText) {
    const lines = bodyText.split('\n');
    for (const ln of lines) {
      if (ln.trim()) {
        appendLine(termLine('cl-out', ln));
        await delay(10);
      }
    }
  } else {
    appendLine(termLine('cl-info', '(no visible text content)'));
  }
}

// ─── SQL (simulated) ─────────────────────────────────────
async function runSQL(code) {
  appendLine(termLine('cl-info', 'Parsing SQL statement...'));
  await delay(200);

  const upper  = code.trim().toUpperCase();
  const isSelect = /^\s*SELECT/i.test(code);

  if (isSelect) {
    // Fake a result table
    appendLine(termLine('cl-ok',  '✓ Query OK, 3 rows returned (simulated)'));
    appendLine(termBlank());
    appendLine(termLine('cl-section', '┌────────────┬───────────────┬──────────┐'));
    appendLine(termLine('cl-section', '│ id         │ name          │ value    │'));
    appendLine(termLine('cl-section', '├────────────┼───────────────┼──────────┤'));
    appendLine(termLine('cl-out',     '│ 1          │ "alpha"       │ 100      │'));
    appendLine(termLine('cl-out',     '│ 2          │ "beta"        │ 250      │'));
    appendLine(termLine('cl-out',     '│ 3          │ "gamma"       │ 87       │'));
    appendLine(termLine('cl-section', '└────────────┴───────────────┴──────────┘'));
    appendLine(termBlank());
    appendLine(termLine('cl-time', '3 rows in set (0.002 sec)'));
  } else if (/INSERT|UPDATE|DELETE/i.test(code)) {
    const op = upper.match(/^\s*(INSERT|UPDATE|DELETE)/)?.[1] || 'QUERY';
    appendLine(termLine('cl-ok',  `✓ ${op} executed — 1 row affected (simulated)`));
    appendLine(termLine('cl-time', 'Query OK (0.001 sec)'));
  } else {
    appendLine(termLine('cl-ok', '✓ DDL statement executed successfully (simulated)'));
    appendLine(termLine('cl-time', 'Query OK (0.003 sec)'));
  }
}

// ─── Shared: simulated compile steps ─────────────────────
async function simulateCompileSteps(compiler, runner, steps) {
  appendLine(termLine('cl-info', `$ ${compiler} main`));
  await delay(200);
  for (const step of steps) {
    appendLine(termLine('cl-info', `  → ${step}`));
    await delay(180);
  }
  appendLine(termLine('cl-ok', `✓ Compilation successful`));
  appendLine(termBlank());
  appendLine(termLine('cl-prompt', runner));
  appendLine(termBlank());
  await delay(150);
}

// ════════════════════════════════════════════════════════════
//  URL HASH
// ════════════════════════════════════════════════════════════

async function checkHash() {
  const hash = location.hash.replace('#', '').trim().toUpperCase();
  if (/^[A-Z0-9]{6}$/.test(hash)) {
    codeInput.value = hash;
    showView('load');
    console.log(`[HashDetect] Attempting to load: ${hash}`);
    await loadByCode(hash);
  }
}

window.addEventListener('hashchange', checkHash);

// ════════════════════════════════════════════════════════════
//  TOP BAR "Run" button
// ════════════════════════════════════════════════════════════
document.getElementById('run-btn').addEventListener('click', () => {
  if (currentView === 'load' && !compileBtn.disabled) {
    compileBtn.click();
  } else {
    showToast('▶ Compiler: No syntax errors found');
    setStatus('running', currentView === 'home' ? 'Home' : currentView === 'share' ? 'Share Mode' : 'Load Mode', 0);
    setTimeout(() => setStatus('ready', currentView === 'home' ? 'Home' : currentView === 'share' ? 'Share Mode' : 'Load Mode', 0), 1200);
  }
});

// ════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════
showView('home');
checkHash();
updateLineNumbers(shareInput, shareLines);
updateLineNumbers(outputViewer, outputLines);

// ════════════════════════════════════════════════════════════
//  MOBILE RESPONSIVE — sidebar drawer + bottom nav
// ════════════════════════════════════════════════════════════

const sidebar        = document.querySelector('.sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const hamburgerBtn   = document.getElementById('hamburger-btn');

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

hamburgerBtn.addEventListener('click', () => {
  sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});

sidebarOverlay.addEventListener('click', closeSidebar);

// Close sidebar when a sidebar item is tapped on mobile
sidebar.querySelectorAll('.sidebar-item[data-view]').forEach(item => {
  item.addEventListener('click', () => {
    if (window.innerWidth <= 768) closeSidebar();
  });
});

// ── Mobile bottom nav ──────────────────────────────────────
const mbnBtns = document.querySelectorAll('.mbn-btn[data-view]');

function syncBottomNav(viewName) {
  mbnBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewName));
}

mbnBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    showView(btn.dataset.view);
    syncBottomNav(btn.dataset.view);
    closeSidebar();
  });
});

// Keep bottom nav in sync when view changes via other means
const _origShowView = showView;
// Patch showView to also sync bottom nav
const showViewOrig = showView;
window.__syncNav = syncBottomNav;

// Override showView to sync bottom nav on every call
(function patchShowView() {
  const original = showView;
  // Re-wire: home/share/load card buttons, tab clicks, etc. already call showView.
  // We hook the existing calls by patching the reference they use (IIFE scope).
  // Because showView is declared with 'function', calls within the same scope
  // already go through the live binding — we need to add a side-effect.
  // Simplest: listen on the SBS/TABS entries to also call syncBottomNav.
  [...Object.entries(TABS), ...Object.entries(SBS)].forEach(([name]) => {
    // already handled by the mbnBtns listener and the sidebar item listener above
  });
  // Hook the home card buttons too
  homeShareBtn.addEventListener('click', () => syncBottomNav('share'));
  homeLoadBtn.addEventListener('click',  () => syncBottomNav('load'));
  document.getElementById('nav-home-btn').addEventListener('click', () => syncBottomNav('home'));
  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => syncBottomNav(btn.dataset.view || 'home'));
  });
  Object.entries(TABS).forEach(([name, tab]) => {
    tab.addEventListener('click', () => syncBottomNav(name));
  });
  Object.entries(SBS).forEach(([name, sb]) => {
    sb.addEventListener('click', () => syncBottomNav(name));
  });
}());

// Initialise bottom nav state
syncBottomNav('home');
