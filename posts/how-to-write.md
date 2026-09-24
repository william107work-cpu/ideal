新增文章只要三步：

## 1. 新增一個 Markdown 檔

在 `posts/` 資料夾裡建立一個新檔案，例如 `my-day.md`，然後用 Markdown 寫內容：

```markdown
## 小標題

一般文字，**粗體**，`程式碼`。

- 清單項目
```

## 2. 登記到 posts.json

打開 `posts/posts.json`，加上一筆：

```json
{
  "id": "my-day",
  "title": "今天的冒險",
  "date": "2026-10-01",
  "tags": ["日常"],
  "summary": "一句話介紹這篇文章。"
}
```

`id` 要和檔名一樣（不用加 `.md`）。

## 3. Commit 並推送

推送到 GitHub 之後，約一兩分鐘網站就會更新。

> 小技巧：直接在 GitHub 網頁上按 **Add file → Create new file** 也可以寫文章，不用開電腦終端機。
