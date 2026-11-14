# 角色紀錄格式 v1

角色資料不再直接等同於一個瀏覽器存檔。應用程式會以「角色紀錄」包住既有角色資料，並把建立角色時的固定資料與跑團中持續變動的狀態分開。

```json
{
  "recordVersion": 1,
  "id": "角色 ID",
  "ruleset": "2014 或 2024",
  "revision": 3,
  "updatedAt": 1710000000000,
  "ownerId": null,
  "campaignId": null,
  "character": {},
  "runtime": {
    "play": {},
    "slotsUsed": {}
  },
  "sync": {
    "dirty": true,
    "baseRevision": 2
  }
}
```

## 欄位責任

- `character`：職業、種族／物種、背景、屬性、等級、法術選擇、裝備、角色設定等建立角色的資料。
- `runtime.play`：目前生命、暫時生命、死亡豁免、生命骰、資源計數器、狀態等跑團資料。
- `runtime.slotsUsed`：已消耗法術位。
- `revision`：每次成功儲存遞增，未來用於偵測手機、桌機或 DM 後台同時修改造成的衝突。
- `ownerId`、`campaignId`：GitHub Pages 階段保留為空；遷移 Sites 後連結登入玩家與團務。

## 瀏覽器遷移規則

1. 優先讀取 `dnd5r:record:<id>`。
2. 若只有舊版 `dnd5r:char:<id>`，在記憶體中轉成 v1，但不立即改動玩家資料。
3. 玩家下一次成功儲存時，先寫入新版紀錄；確認完成後才移除同角色的舊版副本，避免大型角色畫像占用雙倍空間。
4. JSON 匯出仍使用原有可攜式角色存檔格式，因此舊版匯入／匯出流程維持相容。

## Sites / D1 對應方向

上線 Sites 時，紀錄可直接拆入 `characters` 表：`id`、`owner_id`、`campaign_id`、`ruleset`、`revision`、`character_json`、`runtime_json`、`updated_at`。更新時需同時比對 `revision`，避免較舊的裝置覆蓋較新的跑團狀態。角色畫像等大型二進位資料則改存 R2，紀錄只保留檔案識別碼。
