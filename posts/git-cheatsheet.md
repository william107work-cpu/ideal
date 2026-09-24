整理日常開發中最常用的 Git 指令，方便隨時查閱。

## 基本流程

```bash
git status              # 查看目前狀態
git add .               # 將所有變更加入暫存區
git commit -m "訊息"     # 建立提交
git push                # 推送到遠端
```

## 分支

```bash
git switch -c feature/x # 建立並切換到新分支
git switch main         # 切回 main
git merge feature/x     # 合併分支
git branch -d feature/x # 刪除已合併的分支
```

## 查看歷史

```bash
git log --oneline --graph --all   # 精簡的分支圖
git diff                          # 尚未暫存的變更
git diff --staged                 # 已暫存、尚未提交的變更
```

## 反悔

```bash
git restore file.txt          # 捨棄工作區對檔案的修改
git restore --staged file.txt # 取消暫存，保留修改
git commit --amend            # 修改最後一次提交（尚未推送時）
git revert <commit>           # 用新提交抵銷某次提交（安全，適合已推送）
```

> `git reset --hard` 會直接丟掉未提交的修改，使用前務必確認。
