# 角色快照分享格式 v1

## 目的

GitHub Pages 沒有後端資料庫，因此角色分享採用可攜式 URL 快照。完整角色建立資料與當下跑團計數會被序列化、壓縮後放在 URL fragment（`#character=...`）中；fragment 不會隨 HTTP 請求送到網站伺服器。

## 格式

- 外層識別：`dnd5r-character-snapshot`
- 格式版本：`1`
- `g.` 前綴：UTF-8 JSON 經 gzip 後轉為 Base64URL
- `j.` 前綴：不支援 CompressionStream 時的 UTF-8 JSON Base64URL 後備格式
- 角色畫像會排除，避免 data URL 讓分享網址與 QR Code 超過容量
- 角色資料與 `play`、`slotsUsed` 跑團狀態均會保留

接收流程不會自動改寫本機角色。使用者先看名稱、版本、職業及等級摘要，按下「儲存副本並開啟跑團卡」後，程式才產生新的角色 ID 並加入角色庫。

## QR 與隱私

QR Code 由隨專案提供的 `qrcode-generator` 瀏覽器程式本機產生，不呼叫第三方 QR API。若快照超過 QR Code 最大容量，仍可使用複製連結或系統分享。

`assets/vendor/qrcode.js` 來自 Kazuhiko Arase 的 `qrcode-generator` 1.4.4，依 MIT License 使用；原始檔案保留著作權與授權標頭。

## 未來 Sites 遷移

此格式是不可變的分享快照，不負責多人即時同步。遷移到 Sites 後，可保留此格式作為離線匯入／匯出與匿名分享；登入角色、團務與 DM 即時檢閱則改用具修訂版號的後端角色紀錄。
