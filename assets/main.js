// ============ 網站設定 ============
const SITE = {
  name: "ideal", // 網站名稱
  author: "William", // 作者名稱
};

document.querySelectorAll("[data-site-name]").forEach((el) => (el.textContent = SITE.name));
document.querySelectorAll("[data-author]").forEach((el) => (el.textContent = SITE.author));
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ============ 工具函式 ============
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function readingMinutes(text) {
  return Math.max(1, Math.round(text.replace(/\s/g, "").length / 400));
}

function hash(str) {
  let h = 2166136261;
  for (const ch of str) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ============ 文章封面：依文章 id 產生固定的紋理圖 ============
const PALETTES = [
  ["#6366f1", "#22d3ee"],
  ["#8b5cf6", "#ec4899"],
  ["#10b981", "#3b82f6"],
  ["#f59e0b", "#ef4444"],
  ["#06b6d4", "#a855f7"],
  ["#3b82f6", "#14b8a6"],
];

function coverSVG(id) {
  const h = hash(id);
  const [a, b] = PALETTES[h % PALETTES.length];
  const kind = (h >>> 4) % 4;
  const u = `c${h.toString(36)}`;
  const x1 = 40 + (h % 200);
  const x2 = 200 + ((h >>> 8) % 180);

  const patterns = [
    // 網格
    `<pattern id="${u}p" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#fff" stroke-opacity=".09"/></pattern>`,
    // 點陣
    `<pattern id="${u}p" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#fff" fill-opacity=".16"/></pattern>`,
    // 斜線
    `<pattern id="${u}p" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V10" stroke="#fff" stroke-opacity=".08" stroke-width="2"/></pattern>`,
    // 電路
    `<pattern id="${u}p" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M0 12H18L24 18V48M30 0V10L38 18H48M12 48V32L18 26H30" fill="none" stroke="#fff" stroke-opacity=".1"/><circle cx="24" cy="18" r="2" fill="#fff" fill-opacity=".18"/><circle cx="38" cy="18" r="2" fill="#fff" fill-opacity=".18"/></pattern>`,
  ];

  // 同心環或波形，讓每張封面多一點變化
  const rings = Array.from({ length: 6 }, (_, i) =>
    `<circle cx="${x2}" cy="${110 + ((h >>> 12) % 60) - 30}" r="${30 + i * 26}" fill="none" stroke="${b}" stroke-opacity="${0.35 - i * 0.05}"/>`
  ).join("");
  const waves = Array.from({ length: 7 }, (_, i) => {
    const y = 60 + i * 20;
    const amp = 10 + ((h >>> (i + 2)) % 18);
    return `<path d="M0 ${y} C 100 ${y - amp}, 200 ${y + amp}, 400 ${y - amp / 2}" fill="none" stroke="${b}" stroke-opacity="${0.12 + i * 0.04}"/>`;
  }).join("");

  return `<svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      ${patterns[kind]}
      <radialGradient id="${u}a" cx="${x1 / 400}" cy="0.2" r="0.7"><stop offset="0" stop-color="${a}" stop-opacity=".85"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient>
      <radialGradient id="${u}b" cx="${x2 / 400}" cy="0.9" r="0.6"><stop offset="0" stop-color="${b}" stop-opacity=".7"/><stop offset="1" stop-color="${b}" stop-opacity="0"/></radialGradient>
      <filter id="${u}n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .5 0"/></filter>
    </defs>
    <rect width="400" height="220" fill="#0c0c12"/>
    <rect width="400" height="220" fill="url(#${u}a)"/>
    <rect width="400" height="220" fill="url(#${u}b)"/>
    ${kind % 2 ? waves : rings}
    <rect width="400" height="220" fill="url(#${u}p)"/>
    <rect width="400" height="220" filter="url(#${u}n)" opacity=".18"/>
  </svg>`;
}

// ============ 迷你 Markdown 轉換器 ============
function inlineMD(s) {
  return escapeHTML(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderMarkdown(md) {
  const lines = md.replace(/\r/g, "").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim() || "text";
      const code = [];
      while (++i < lines.length && !/^```/.test(lines[i])) code.push(lines[i]);
      i++;
      out.push(`<div class="code-block"><div class="code-bar"><span>${escapeHTML(lang)}</span><button class="copy" type="button">複製</button></div><pre><code>${escapeHTML(code.join("\n"))}</code></pre></div>`);
    } else if (/^#{1,6}\s/.test(line)) {
      const level = line.match(/^#+/)[0].length;
      out.push(`<h${level}>${inlineMD(line.slice(level).trim())}</h${level}>`);
      i++;
    } else if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<blockquote>${renderMarkdown(quote.join("\n"))}</blockquote>`);
    } else if (/^\s*([-*]|\d+\.)\s/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s/.test(lines[i])) {
        items.push(`<li>${inlineMD(lines[i++].replace(/^\s*([-*]|\d+\.)\s/, ""))}</li>`);
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${items.join("")}</${tag}>`);
    } else if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      out.push("<hr>");
      i++;
    } else if (line.trim() === "") {
      i++;
    } else {
      const para = [];
      while (i < lines.length && lines[i].trim() !== "" && !/^(```|#{1,6}\s|>|\s*([-*]|\d+\.)\s)/.test(lines[i])) {
        para.push(lines[i++]);
      }
      out.push(`<p>${inlineMD(para.join(" "))}</p>`);
    }
  }
  return out.join("\n");
}

async function loadPosts() {
  const res = await fetch("posts/posts.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("posts.json 讀取失敗");
  const posts = await res.json();
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

function tagChips(tags) {
  return (tags || []).map((t) => `<span class="chip">${escapeHTML(t)}</span>`).join("");
}

// ============ 首頁 ============
(async function home() {
  const list = document.getElementById("post-list");
  if (!list) return;

  let posts;
  try {
    posts = await loadPosts();
  } catch (err) {
    list.innerHTML = `<p class="note">無法載入文章。若是在本機直接開啟檔案，請改用本地伺服器預覽（見 README）。</p>`;
    return;
  }

  const latest = document.getElementById("latest");
  if (latest && posts[0]) {
    latest.href = `post.html?id=${encodeURIComponent(posts[0].id)}`;
    latest.querySelector("span").textContent = posts[0].title;
    latest.hidden = false;
  }

  list.innerHTML = posts.map((p) => `
    <a class="card" href="post.html?id=${encodeURIComponent(p.id)}">
      <div class="cover">${coverSVG(p.id)}</div>
      <div class="card-body">
        <div class="chips">${tagChips(p.tags)}</div>
        <h3>${escapeHTML(p.title)}</h3>
        ${p.summary ? `<p>${escapeHTML(p.summary)}</p>` : ""}
        <div class="card-meta"><time datetime="${escapeHTML(p.date)}">${escapeHTML(p.date)}</time><span class="arrow">→</span></div>
      </div>
    </a>`).join("") || `<p class="note">尚無文章。</p>`;
})();

// ============ 文章頁 ============
(async function article() {
  const box = document.getElementById("article");
  if (!box) return;
  const id = new URLSearchParams(location.search).get("id");

  try {
    const posts = await loadPosts();
    const post = posts.find((p) => p.id === id);
    if (!post) throw new Error("找不到這篇文章。");
    const res = await fetch(`posts/${encodeURIComponent(post.id)}.md`, { cache: "no-cache" });
    if (!res.ok) throw new Error("文章內容讀取失敗。");
    const md = await res.text();
    document.title = `${post.title} · ${SITE.name}`;
    box.innerHTML = `
      <div class="banner">${coverSVG(post.id)}</div>
      <header class="article-header">
        <div class="chips">${tagChips(post.tags)}</div>
        <h1>${escapeHTML(post.title)}</h1>
        <p class="meta"><time datetime="${escapeHTML(post.date)}">${escapeHTML(post.date)}</time><span>${readingMinutes(md)} min read</span></p>
      </header>
      <div class="prose">${renderMarkdown(md)}</div>`;
  } catch (err) {
    box.innerHTML = `<p class="note">${escapeHTML(err.message)}</p>`;
  }
})();

// ============ 程式碼複製按鈕 ============
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".copy");
  if (!btn) return;
  const code = btn.closest(".code-block").querySelector("code").innerText;
  try {
    await navigator.clipboard.writeText(code);
    btn.textContent = "已複製";
  } catch {
    btn.textContent = "複製失敗";
  }
  setTimeout(() => (btn.textContent = "複製"), 1500);
});

// ============ 閱讀進度條 ============
(function progress() {
  const bar = document.getElementById("progress");
  if (!bar) return;
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  };
  addEventListener("scroll", update, { passive: true });
  addEventListener("resize", update);
  update();
})();
