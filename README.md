# 淘寶採購協作技能

公開版版本：2026-10-06。以 energypantry/agent-browser-runtime 為基礎，保留 Apache-2.0 LICENSE 與 NOTICE。

讓 Agent 透過真實瀏覽器搜尋產品、整理證據與附圖中英比對報告。可從產品描述、參考圖或規格附件開始，無須先準備 Excel。這是技能與命令列工具，提示會顯示在聊天或終端機，不是獨立網站或原生上傳視窗。

## 新增功能

- 純文字：至少 20 個有效字元，計中文字、英文字母及數字，不計空白、標點與表情符號。
- 只有圖片：可開始；不強迫補滿 20 字。Agent 先檢視圖片，若無法辨識產品再追問。
- 只有附件：先讀取產品內容或擷取參考圖；空白、損壞、不相關或無法讀取的附件需補件。
- 都沒有：提示上傳圖片／規格檔或輸入產品描述，不進行空查詢。
- 初篩保留及待確認候選去重後超過 30 件：提示補充用途、材質、尺寸、預算、必要功能或參考圖。保留完整紀錄，等待補充，或依使用者指示分批查核。
- 未提供參考價時不自行套用預算或用價格淘汰。20 字／30 件皆為可調整預設。

## 安裝與啟動

1. 準備 Docker Compose、Node.js（支援 node:test、ES modules）、Python 3 與 `pip install -r requirements.txt`。
2. 複製 `.env.example` 為本機 `.env`。Windows 執行 `start-local.cmd`；其他環境執行 `docker compose up --build -d`。
3. `node cli/brs.js status` 檢查 `extensionConnected: true`。登入、滑塊與選圖驗證由使用者在 noVNC 完成。
4. 將 `skills/codex/agent-browser-runtime` 複製至你的技能目錄，啟動技能時告知本儲存庫路徑。工具需從儲存庫根目錄執行，不能只安裝技能就假設 Runtime 已啟動。

## 使用範例

```sh
# 沒有資料：顯示提示，結束碼 2，不搜尋
node scripts/procurement-input.mjs demo-bag

# 文字、圖片、附件任選，不需三者齊備
node scripts/procurement-input.mjs demo-bag --description "黑色防水通勤後背包容量二十四公升需要獨立電腦夾層"
node scripts/procurement-input.mjs demo-photo --image "/path/to/bag.png"
node scripts/procurement-input.mjs demo-spec --file "/path/to/spec.pdf"
# Agent 讀取附件後，以實際內容整理摘要再執行；不要杜撰摘要湊字數
node scripts/procurement-input.mjs demo-spec --file "/path/to/spec.pdf" --attachment-summary "黑色防水通勤後背包容量二十四公升需要獨立電腦夾層"

# 使用可用 Runtime，採購搜尋需走此 wrapper
node scripts/procurement-browser.mjs demo-bag extract taobao.extract.js https://www.taobao.com/ --params '{"mode":"textSearch","query":"黑色 防水 通勤 背包 24L","maxItems":60}'

# 讀取已保存搜尋結果，在詳查前產生初篩與範圍提示
python scripts/procurement-shortlist.py --input data/demo-bag/latest.json --output data/demo-bag/screening.json
```

上例 JSON 引號是 POSIX shell 格式；Windows PowerShell 呼叫時需依版本傳遞參數。實際搜尋由 Agent 依參考圖／描述決定查詢，檔案不會因輸入檢查而自動傳到淘寶。只有授權圖搜時才上傳指定參考圖。

圖片支援 PNG、JPEG、GIF、WebP。附件支援 PDF、XLSX、XLS、DOCX、TXT、CSV、MD，但是否能抽取內容仍依 Agent 可用工具而定。檔頭檢查不是完整圖片解碼或產品辨識；語意與圖片相關性需由 Agent 檢視。

`--min-chars` 可調整純文字門檻，`--limit` 可調整初篩提示門檻。每次重新執行輸入工具會取代該 run 的輸入，補充需求時要帶上仍適用的原描述與附件。換商品使用新 run。

初篩輸入接受產品陣列、`products` 或 `result.products`。每筆可提供 `product_id`、`product_url`、`comparable_price`、`conditional`、`bundle`、`mismatch`。只有核對幣別／單位後才填 `comparable_price`；`mismatch` 僅填有證據的必要規格衝突。使用 `--reference` 才啟用參考價偏差排除。所有原始卡片與理由均保留，未知 ID 不憑照片或標題去重。

## 驗證與限制

```sh
node --test scripts/test-procurement-input.mjs
python scripts/test-procurement-shortlist.py
python scripts/procurement-screen.py
node --test broker/test/*.test.js
```

瀏覽器採購入口會檢查輸入；通用低階 `cli/brs.js` 保持原功能。初篩提示由 `procurement-shortlist.py` 產生，技能負責顯示提示並等候使用者；不宣稱它能自行理解所有產品或全自動生成任意報告。PDF 由 Agent 依每輪證據製作，需另有 PDF 工具及中文字型，交付前逐頁檢查。

本公開包不含客戶附件、採購記錄、報價 PDF、商家實圖、登入資料或私人 Git 歷史。這些資料會存入本機忽略目錄。上游通用瀏覽器功能保留，不將其實驗性功能作為繞過驗證的方法。
