# ideal

一個簡潔的個人博客。

## 開啟網站（GitHub Pages）

1. 到倉庫的 **Settings → Pages**
2. **Source** 選 `Deploy from a branch`，分支選 `main`（或目前的分支），資料夾選 `/ (root)`，按 **Save**
3. 等一兩分鐘，網站會出現在 `https://william107work-cpu.github.io/ideal/`

## 新增文章

1. 在 `posts/` 新增 `你的文章id.md`
2. 在 `posts/posts.json` 加一筆資料（`id`、`title`、`date`、`tags`、`summary`）
3. Commit 並 push

詳細步驟可以看網站上〈怎麼新增一篇文章？〉那篇。

## 個人化

- 網站名稱、作者：`assets/main.js` 最上面的 `SITE`
- 首頁簡介與「關於」：`index.html`
- 顏色與字體：`assets/style.css` 最上面的 `:root` 變數（已支援深色模式）

## 本地預覽

```bash
python3 -m http.server
```

然後打開 http://localhost:8000 。直接雙擊 `index.html` 會讀不到文章。
