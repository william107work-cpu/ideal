// ============ 網站設定 ============
const SITE = {
  name: "ideal", // 網站名稱
  author: "William", // 作者名稱
};

document.querySelectorAll("[data-site-name]").forEach((el) => (el.textContent = SITE.name));
document.querySelectorAll("[data-author]").forEach((el) => (el.textContent = SITE.author));
document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

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

// 可重現的亂數：同一個種子永遠產生同一串數字
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalize(x, y, z) {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

// ============ 單色抖動圖 ============
// 先算出每個格子的明暗，再用 Bayer 8×8 門檻矩陣決定點不點亮。
// 淺色模式畫深色墨點（墨點代表陰影），深色模式畫淺色光點（光點代表亮部）。
const CELL = 2; // 每個抖動格子的 CSS 像素大小
const BG_LEVEL = 0.02; // 背景：每 8×8 格點亮一格，形成淡淡的點陣
// 格子類型：背景、物體表面、線條、固定密度（主色）、固定密度（淡灰）
const BG = 0, SURFACE = 1, LINE = 2, RAW = 3, SOFT = 4;

const BAYER = (() => {
  let m = [[0]];
  while (m.length < 8) {
    const n = m.length;
    const next = Array.from({ length: n * 2 }, () => new Array(n * 2));
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = m[y][x] * 4;
        next[y][x] = v;
        next[y][x + n] = v + 2;
        next[y + n][x] = v + 3;
        next[y + n][x + n] = v + 1;
      }
    }
    m = next;
  }
  return m.map((row) => row.map((v) => (v + 0.5) / 64));
})();

// 立體形狀：以光線步進（ray marching）求交點，再用 Lambert＋高光算明暗
function sdfScene(sdf, bound, pick) {
  return (cols, rows, rng, overrides) => {
    const o = { ox: 0, cam: 3.9, ...pick(rng), ...overrides };
    const cx = Math.cos(o.rx), sx = Math.sin(o.rx);
    const cy = Math.cos(o.ry), sy = Math.sin(o.ry);
    const f = (x, y, z) => {
      x -= o.ox;
      const x1 = cy * x + sy * z;
      const z1 = -sy * x + cy * z;
      return sdf(x1, cx * y - sx * z1, sx * y + cx * z1);
    };
    const [lx, ly, lz] = normalize(-0.55, 0.7, 0.55);
    const [hx, hy, hz] = normalize(lx, ly, lz + 1);
    const v = new Float32Array(cols * rows);
    const kind = new Uint8Array(cols * rows);
    const half = Math.min(cols, rows) / 2; // 以短邊為準，物體不會被裁掉
    const tanF = 0.42;
    // 包圍球：光線沒碰到就直接當背景，省下大部分計算
    const ocx = -o.ox, ocz = o.cam;
    const occ = ocx * ocx + ocz * ocz - bound * bound;

    for (let py = 0; py < rows; py++) {
      for (let px = 0; px < cols; px++) {
        const [dx, dy, dz] = normalize(
          ((px + 0.5 - cols / 2) / half) * tanF,
          (-(py + 0.5 - rows / 2) / half) * tanF,
          -1
        );
        const b = ocx * dx + ocz * dz;
        const disc = b * b - occ;
        if (disc < 0) continue;
        const tEnd = -b + Math.sqrt(disc);
        let t = Math.max(0, -b - Math.sqrt(disc));
        let hit = false;
        for (let i = 0; i < 64 && t < tEnd; i++) {
          const d = f(dx * t, dy * t, o.cam + dz * t);
          if (d < 0.001) { hit = true; break; }
          t += d;
        }
        if (!hit) continue;
        const x = dx * t, y = dy * t, z = o.cam + dz * t, e = 0.001;
        const [nx, ny, nz] = normalize(
          f(x + e, y, z) - f(x - e, y, z),
          f(x, y + e, z) - f(x, y - e, z),
          f(x, y, z + e) - f(x, y, z - e)
        );
        const diff = Math.max(0, nx * lx + ny * ly + nz * lz);
        const spec = Math.pow(Math.max(0, nx * hx + ny * hy + nz * hz), 40);
        const i = py * cols + px;
        kind[i] = SURFACE;
        v[i] = Math.min(1, 0.05 + 0.85 * diff + 0.5 * spec);
      }
    }
    return { v, kind };
  };
}

// 地形：值噪聲高度場，畫成等高線加淡淡的暈渲
function terrainScene(cols, rows, rng) {
  const perm = new Uint8Array(512);
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) { perm[i] = i; vals[i] = rng(); }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const lattice = (x, y) => vals[perm[(x & 255) + perm[y & 255]]];
  const smooth = (t) => t * t * (3 - 2 * t);
  const noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const u = smooth(x - xi), w = smooth(y - yi);
    const a = lattice(xi, yi), b = lattice(xi + 1, yi);
    const c = lattice(xi, yi + 1), d = lattice(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
  const fbm = (x, y) => {
    let s = 0, amp = 0.55, freq = 1;
    for (let k = 0; k < 3; k++) {
      s += amp * noise(x * freq, y * freq);
      freq *= 2.1;
      amp *= 0.45;
    }
    return s;
  };

  const scale = 1.3 / Math.min(cols, rows);
  const ox = rng() * 100, oy = rng() * 100;
  const h = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) h[y * cols + x] = fbm(ox + x * scale, oy + y * scale);
  }

  const v = new Float32Array(cols * rows);
  const kind = new Uint8Array(cols * rows).fill(SOFT);
  const levels = 16;
  const k = Math.min(cols, rows) * 1.2;
  const [lx, ly, lz] = normalize(-1, -1, 1.4);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const r = x < cols - 1 ? h[i + 1] : h[i];
      const l = x > 0 ? h[i - 1] : h[i];
      const d = y < rows - 1 ? h[i + cols] : h[i];
      const u = y > 0 ? h[i - cols] : h[i];
      const level = Math.floor(h[i] * levels);
      if ((x < cols - 1 && Math.floor(r * levels) !== level) || (y < rows - 1 && Math.floor(d * levels) !== level)) {
        kind[i] = LINE;
        continue;
      }
      const [nx, ny, nz] = normalize(-(r - l) * k, -(d - u) * k, 1);
      const shade = Math.max(0, nx * lx + ny * ly + nz * lz);
      v[i] = BG_LEVEL + 0.3 * Math.pow(1 - shade, 2);
    }
  }
  return { v, kind };
}

const SCENES = {
  sphere: sdfScene((x, y, z) => Math.hypot(x, y, z) - 1.1, 1.15, () => ({ rx: 0, ry: 0 })),
  torus: sdfScene(
    (x, y, z) => Math.hypot(Math.hypot(x, z) - 1.0, y) - 0.4,
    1.45,
    (rng) => ({ rx: 0.9 + rng() * 0.4, ry: (rng() - 0.5) * 0.8 })
  ),
  box: sdfScene(
    (x, y, z) => {
      const b = 0.74, r = 0.08;
      const qx = Math.abs(x) - b, qy = Math.abs(y) - b, qz = Math.abs(z) - b;
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
    },
    1.45,
    (rng) => ({ rx: 0.5 + rng() * 0.3, ry: (rng() < 0.5 ? -1 : 1) * (0.6 + rng() * 0.3) })
  ),
  octahedron: sdfScene(
    (x, y, z) => (Math.abs(x) + Math.abs(y) + Math.abs(z) - 1.35) * 0.57735,
    1.4,
    (rng) => ({ rx: 0.3 + rng() * 0.3, ry: 0.4 + rng() * 0.4 })
  ),
  terrain: terrainScene,
  // 標誌用：對角線漸層，深淺模式都一樣
  ramp: (cols, rows) => {
    const v = new Float32Array(cols * rows);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) v[y * cols + x] = 1 - (x + y + 1) / (cols + rows - 1);
    }
    return { v, kind: new Uint8Array(cols * rows).fill(RAW) };
  },
};

const COVER_SCENES = ["sphere", "torus", "box", "octahedron", "terrain"];

function coverOf(post) {
  return COVER_SCENES.includes(post.cover) ? post.cover : COVER_SCENES[hash(post.id) % COVER_SCENES.length];
}

function paintDither(canvas) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  const dpr = window.devicePixelRatio || 1;
  const cell = Math.max(1, Math.round(CELL * dpr));
  const W = Math.round(w * dpr), H = Math.round(h * dpr);
  const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
  const style = getComputedStyle(canvas);
  const ink = style.getPropertyValue("--dither").trim() || "#111";
  const softInk = style.getPropertyValue("--dither-bg").trim() || ink;
  const invert = style.getPropertyValue("--dither-invert").trim() === "1";
  const key = `${cols}x${rows}|${ink}|${softInk}`;
  if (canvas.dataset.key === key) return;
  canvas.dataset.key = key;

  const ds = canvas.dataset;
  const overrides = {};
  for (const name of ["rx", "ry", "ox", "cam"]) {
    if (ds[name] !== undefined && ds[name] !== "") overrides[name] = Number(ds[name]);
  }
  const scene = SCENES[ds.scene] || SCENES.sphere;
  const { v, kind } = scene(cols, rows, mulberry32(hash(ds.seed || ds.scene)), overrides);

  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  // 兩次繪製：先畫淡灰的背景點陣與暈渲，再畫主色的形體與線條
  for (const soft of [true, false]) {
    ctx.fillStyle = soft ? softInk : ink;
    for (let y = 0; y < rows; y++) {
      const row = BAYER[y & 7];
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const k = kind[i];
        if ((k === BG || k === SOFT) !== soft) continue;
        const level =
          k === BG ? BG_LEVEL :
          k === LINE ? 1 :
          k === RAW || k === SOFT ? v[i] :
          invert ? 0.06 + 0.8 * (1 - v[i]) : v[i];
        if (level > row[x & 7]) ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }
}

const resizeTimers = new WeakMap();
const resizeObserver = window.ResizeObserver
  ? new ResizeObserver((entries) => {
      for (const { target } of entries) {
        if (!target.dataset.key) {
          paintDither(target);
          continue;
        }
        clearTimeout(resizeTimers.get(target));
        resizeTimers.set(target, setTimeout(() => paintDither(target), 150));
      }
    })
  : null;

function mountDither(root) {
  root.querySelectorAll("canvas[data-scene]").forEach((canvas) => {
    if (resizeObserver) resizeObserver.observe(canvas);
    else paintDither(canvas);
  });
}

// 系統切換深淺色時重畫
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
if (darkQuery.addEventListener) {
  darkQuery.addEventListener("change", () => document.querySelectorAll("canvas[data-scene]").forEach(paintDither));
}

mountDither(document);

// ============ 迷你 Markdown 轉換器 ============
function inlineMD(s) {
  return escapeHTML(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

// 只把註解調成灰色，其餘維持單色
const COMMENT_MARK = {
  bash: "#", sh: "#", shell: "#", zsh: "#", text: "#", python: "#", py: "#", yaml: "#", yml: "#", toml: "#",
  js: "//", javascript: "//", ts: "//", typescript: "//", css: null, json: null,
};

function highlight(code, lang) {
  const html = escapeHTML(code);
  const mark = COMMENT_MARK[lang];
  if (!mark) return html;
  const re = mark === "#" ? /(^|\s)(#.*)$/gm : /(^|\s)(\/\/.*)$/gm;
  return html.replace(re, '$1<span class="tok-comment">$2</span>');
}

function renderMarkdown(md) {
  const lines = md.replace(/\r/g, "").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim().toLowerCase() || "text";
      const code = [];
      while (++i < lines.length && !/^```/.test(lines[i])) code.push(lines[i]);
      i++;
      out.push(`<div class="code-block"><div class="code-bar"><span>${escapeHTML(lang)}</span><button class="copy" type="button">複製</button></div><pre><code>${highlight(code.join("\n"), lang)}</code></pre></div>`);
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

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

const postURL = (p) => `post.html?id=${encodeURIComponent(p.id)}`;

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

  const topics = [...new Set(posts.flatMap((p) => p.tags || []))];
  setText("stat-count", String(posts.length).padStart(2, "0"));
  setText("stat-topics", String(topics.length).padStart(2, "0"));
  setText("stat-updated", posts[0] ? posts[0].date : "—");
  setText("post-count", `${posts.length} 篇 · 依時間排序`);

  list.innerHTML = posts.map((p) => `
    <a class="card" href="${postURL(p)}">
      <div class="cover"><canvas data-scene="${coverOf(p)}" data-seed="${escapeHTML(p.id)}" aria-hidden="true"></canvas></div>
      <div class="card-body">
        <p class="card-meta"><time datetime="${escapeHTML(p.date)}">${escapeHTML(p.date)}</time>${(p.tags || []).length ? `<span>${escapeHTML(p.tags.join(" / "))}</span>` : ""}</p>
        <h3>${escapeHTML(p.title)}</h3>
        ${p.summary ? `<p class="card-summary">${escapeHTML(p.summary)}</p>` : ""}
        <span class="card-more">閱讀全文 →</span>
      </div>
    </a>`).join("") || `<p class="note">尚無文章。</p>`;

  mountDither(list);
})();

// ============ 文章頁 ============
(async function article() {
  const root = document.getElementById("article");
  if (!root) return;
  const id = new URLSearchParams(location.search).get("id");

  let posts, post, md;
  try {
    posts = await loadPosts();
    post = posts.find((p) => p.id === id);
    if (!post) throw new Error("找不到這篇文章。");
    const res = await fetch(`posts/${encodeURIComponent(post.id)}.md`, { cache: "no-cache" });
    if (!res.ok) throw new Error("文章內容讀取失敗。");
    md = await res.text();
  } catch (err) {
    root.innerHTML = `<p class="note">${escapeHTML(err.message)} <a href="./#posts">返回文章列表</a></p>`;
    return;
  }

  document.title = `${post.title} — ${SITE.name}`;
  const index = posts.indexOf(post);
  const older = posts[index + 1];
  const newer = posts[index - 1];
  const pagerCell = (p, label, cls) => p
    ? `<a class="${cls}" href="${postURL(p)}"><span class="pager-label">${label}</span><span class="pager-title">${escapeHTML(p.title)}</span></a>`
    : `<span class="${cls} empty"></span>`;

  root.innerHTML = `
    <section class="block article-head">
      <a class="crumb" href="./#posts">← 所有文章</a>
      <p class="meta"><time datetime="${escapeHTML(post.date)}">${escapeHTML(post.date)}</time><span>${readingMinutes(md)} 分鐘閱讀</span>${(post.tags || []).length ? `<span>${escapeHTML(post.tags.join(" / "))}</span>` : ""}</p>
      <h1>${escapeHTML(post.title)}</h1>
      ${post.summary ? `<p class="summary">${escapeHTML(post.summary)}</p>` : ""}
    </section>
    <div class="block banner x"><canvas data-scene="${coverOf(post)}" data-seed="${escapeHTML(post.id)}" aria-hidden="true"></canvas></div>
    <div class="block article-body">
      <div class="prose-wrap"><div class="prose">${renderMarkdown(md)}</div></div>
      <aside class="toc"><div class="toc-inner" id="toc"></div></aside>
    </div>
    <nav class="block pager">${pagerCell(older, "← 上一篇", "prev")}${pagerCell(newer, "下一篇 →", "next")}</nav>`;

  mountDither(root);
  buildToc(root);
})();

// ============ 文章目錄 ============
function buildToc(root) {
  const toc = document.getElementById("toc");
  const heads = [...root.querySelectorAll(".prose h2")];
  if (!toc || !heads.length) return;

  heads.forEach((h, i) => {
    const title = h.textContent;
    h.id = `s${i + 1}`;
    h.dataset.title = title;
    h.insertAdjacentHTML("beforeend", `<a class="anchor" href="#${h.id}" aria-label="連結到本段">#</a>`);
  });
  toc.innerHTML = `<p class="toc-title">本文目錄</p><ol>${heads
    .map((h) => `<li><a href="#${h.id}">${escapeHTML(h.dataset.title)}</a></li>`)
    .join("")}</ol>`;

  const links = [...toc.querySelectorAll("a")];
  const update = () => {
    let current = 0;
    heads.forEach((h, i) => {
      if (h.getBoundingClientRect().top < 120) current = i;
    });
    links.forEach((a, i) => a.classList.toggle("active", i === current));
  };
  addEventListener("scroll", update, { passive: true });
  update();
}

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
