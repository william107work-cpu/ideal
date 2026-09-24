// ============ 網站設定：改這裡就好 ============
const SITE = {
  name: "PLAYER", // 你的名字或暱稱
};

// ============ 背景星空 ============
(function starfield() {
  const canvas = document.getElementById("stars");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const PX = 3; // 每顆星星的像素大小
  const colors = ["#ecebff", "#3ef0ff", "#ff4fa3", "#ffd23f"];
  let stars = [];

  function resize() {
    canvas.width = Math.ceil(window.innerWidth / PX);
    canvas.height = Math.ceil(window.innerHeight / PX);
    const count = Math.floor((canvas.width * canvas.height) / 900);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 0.02 + Math.random() * 0.12,
      color: colors[Math.floor(Math.random() * colors.length)],
      phase: Math.random() * Math.PI * 2,
    }));
  }

  function draw(t) {
    ctx.fillStyle = "#0d0b1e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const s of stars) {
      s.y += s.speed;
      if (s.y > canvas.height) s.y = 0;
      if (Math.sin(t / 400 + s.phase) > -0.6) {
        ctx.fillStyle = s.color;
        ctx.fillRect(Math.floor(s.x), Math.floor(s.y), 1, 1);
      }
    }
    requestAnimationFrame(draw);
  }

  canvas.style.imageRendering = "pixelated";
  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(draw);
})();

// ============ 像素頭像 ============
(function avatar() {
  const canvas = document.getElementById("avatar");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const palette = {
    k: "#0d0b1e", // 輪廓
    h: "#6b5cff", // 頭髮
    s: "#ffcf9e", // 皮膚
    p: "#ff4fa3", // 嘴巴
    c: "#3ef0ff", // 衣服
    y: "#ffd23f", // 徽章
  };
  const map = [
    "....kkkkkkkk....",
    "...khhhhhhhhk...",
    "..khhhhhhhhhhk..",
    "..khhhhhhhhhhk..",
    "..khsssssssshk..",
    "..kssssssssssk..",
    "..kskksssskksk..",
    "..kssssssssssk..",
    "..kssssppssssk..",
    "...kssssssssk...",
    "....kkkkkkkk....",
    "...kcccccccck...",
    "..kccccyycccck..",
    "..kcccccccccck..",
    "..kcccccccccck..",
    "..kkkkkkkkkkkk..",
  ];

  function draw(blinking) {
    ctx.clearRect(0, 0, 16, 16);
    map.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        let color = palette[ch];
        if (blinking && y === 6 && ch === "k") color = palette.s;
        if (!color) return;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      });
    });
    if (blinking) {
      ctx.fillStyle = palette.k;
      ctx.fillRect(3, 6, 3, 1);
      ctx.fillRect(10, 6, 3, 1);
    }
  }

  draw(false);
  setInterval(() => {
    draw(true);
    setTimeout(() => draw(false), 150);
  }, 3000);
})();

// ============ 打字機效果 ============
(function typewriter() {
  const el = document.getElementById("typed");
  if (!el) return;
  const text = [...el.dataset.text];
  let i = 0;
  const tick = () => {
    el.textContent = text.slice(0, ++i).join("");
    if (i < text.length) setTimeout(tick, 110);
  };
  setTimeout(tick, 400);
})();

// ============ 能力值條 ============
(function statBars() {
  const bars = document.querySelectorAll(".bar");
  if (!bars.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("fill");
        io.unobserve(e.target);
      }
    });
  });
  bars.forEach((b) => io.observe(b));
})();

// ============ 共用 ============
const nameEl = document.getElementById("player-name");
if (nameEl) nameEl.textContent = SITE.name;
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

// 迷你 Markdown 轉換器：標題、清單、引用、程式碼區塊、粗體、斜體、連結、圖片
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
      const code = [];
      while (++i < lines.length && !/^```/.test(lines[i])) code.push(lines[i]);
      i++;
      out.push(`<pre><code>${escapeHTML(code.join("\n"))}</code></pre>`);
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

// ============ 首頁：文章列表 ============
(async function postList() {
  const list = document.getElementById("post-list");
  if (!list) return;
  const filter = document.getElementById("tag-filter");

  let posts;
  try {
    posts = await loadPosts();
  } catch (err) {
    list.innerHTML = `<li class="loading">ERROR：讀不到文章。如果你是直接雙擊打開檔案，請改用本地伺服器預覽（見 README）。</li>`;
    return;
  }

  const tags = ["全部", ...new Set(posts.flatMap((p) => p.tags || []))];
  let current = "全部";

  function render() {
    const shown = current === "全部" ? posts : posts.filter((p) => (p.tags || []).includes(current));
    list.innerHTML = shown.map((p, i) => `
      <li>
        <a class="post-card" href="post.html?id=${encodeURIComponent(p.id)}">
          <div class="post-meta">QUEST ${String(shown.length - i).padStart(2, "0")} · ${escapeHTML(p.date)}</div>
          <h3 class="post-title">${escapeHTML(p.title)}</h3>
          <p class="post-summary">${escapeHTML(p.summary || "")}</p>
        </a>
      </li>`).join("") || `<li class="loading">這個分類還沒有文章。</li>`;
    filter.innerHTML = tags.map((t) =>
      `<button class="tag${t === current ? " active" : ""}" data-tag="${escapeHTML(t)}">#${escapeHTML(t)}</button>`
    ).join("");
  }

  filter.addEventListener("click", (e) => {
    const btn = e.target.closest(".tag");
    if (!btn) return;
    current = btn.dataset.tag;
    render();
  });

  render();
})();

// ============ 文章頁 ============
(async function article() {
  const box = document.getElementById("article");
  if (!box) return;
  const id = new URLSearchParams(location.search).get("id");

  try {
    const posts = await loadPosts();
    const post = posts.find((p) => p.id === id);
    if (!post) throw new Error("找不到文章");
    const res = await fetch(`posts/${encodeURIComponent(post.id)}.md`, { cache: "no-cache" });
    if (!res.ok) throw new Error("文章內容讀取失敗");
    const md = await res.text();
    document.title = `${post.title} · IDEAL`;
    box.innerHTML = `
      <div class="post-meta">${escapeHTML(post.date)} · ${(post.tags || []).map((t) => "#" + escapeHTML(t)).join(" ")}</div>
      <h1>${escapeHTML(post.title)}</h1>
      ${renderMarkdown(md)}`;
  } catch (err) {
    box.innerHTML = `<p class="loading">GAME OVER：${escapeHTML(err.message)}</p>`;
  }
})();

// ============ 秘技：↑↑↓↓←→←→BA ============
(function konami() {
  const code = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let pos = 0;
  document.addEventListener("keydown", (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = key === code[pos] ? pos + 1 : key === code[0] ? 1 : 0;
    if (pos === code.length) {
      document.body.classList.toggle("rainbow");
      pos = 0;
    }
  });
})();
