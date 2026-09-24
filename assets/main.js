// ============ 網站設定 ============
const SITE = {
  name: "IDEAL", // 網站名稱
  author: "William", // 作者名稱
};

document.querySelectorAll("[data-site-name]").forEach((el) => (el.textContent = SITE.name));
document.querySelectorAll("[data-author]").forEach((el) => (el.textContent = SITE.author));
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y} 年 ${m} 月 ${d} 日`;
}

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

  let posts;
  try {
    posts = await loadPosts();
  } catch (err) {
    list.innerHTML = `<li class="note">無法載入文章。若是在本機直接開啟檔案，請改用本地伺服器預覽（見 README）。</li>`;
    return;
  }

  list.innerHTML = posts.map((p) => `
    <li class="post-item">
      <time datetime="${escapeHTML(p.date)}">${escapeHTML(formatDate(p.date))}</time>
      <h3><a href="post.html?id=${encodeURIComponent(p.id)}">${escapeHTML(p.title)}</a></h3>
      ${p.summary ? `<p>${escapeHTML(p.summary)}</p>` : ""}
    </li>`).join("") || `<li class="note">尚無文章。</li>`;
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
    document.title = `${post.title} — ${SITE.name}`;
    const tags = (post.tags || []).map((t) => escapeHTML(t)).join("、");
    box.innerHTML = `
      <header class="article-header">
        <h1>${escapeHTML(post.title)}</h1>
        <p class="meta"><time datetime="${escapeHTML(post.date)}">${escapeHTML(formatDate(post.date))}</time>${tags ? ` · ${tags}` : ""}</p>
      </header>
      <div class="prose">${renderMarkdown(md)}</div>`;
  } catch (err) {
    box.innerHTML = `<p class="note">${escapeHTML(err.message)}</p>`;
  }
})();
