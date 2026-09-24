這個博客沒有使用任何框架，也不需要建置步驟：只有 HTML、CSS 和一點 JavaScript，放在 GitHub Pages 上直接託管。這篇記錄它的架構。

## 專案結構

```text
ideal/
├── index.html        # 首頁：文章列表
├── post.html         # 文章頁：依網址參數載入文章
├── assets/
│   ├── style.css
│   └── main.js       # Markdown 轉換、封面產生、頁面邏輯
└── posts/
    ├── posts.json    # 文章索引
    └── *.md          # 文章內容
```

## 運作方式

1. 首頁用 `fetch` 讀取 `posts/posts.json`，依日期排序後產生文章卡片。
2. 點進文章時，網址會帶上 `?id=文章id`，`post.html` 再去讀取對應的 `.md` 檔。
3. `main.js` 內建一個迷你 Markdown 轉換器，支援標題、清單、引用和程式碼區塊。

```js
const id = new URLSearchParams(location.search).get("id");
const res = await fetch(`posts/${encodeURIComponent(id)}.md`);
const html = renderMarkdown(await res.text());
```

## 文章封面

每張卡片的封面圖不是圖片檔，而是用文章 `id` 算出雜湊值，再挑選配色與紋理（網格、點陣、斜線、電路），即時產生 SVG。同一篇文章的封面永遠一樣，也不需要另外準備圖片。

## 為什麼不用框架

- **零依賴**：沒有 `node_modules`，也不怕套件過期。
- **部署簡單**：`git push` 之後，GitHub Pages 會自動上線。
- **好維護**：整個網站只有幾個檔案，隨時都能看懂。

> 之後如果文章變多，再考慮換成 Astro 或 Hugo 這類靜態網站產生器。
