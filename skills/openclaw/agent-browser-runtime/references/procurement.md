# Product procurement from text, images or documents

Use repository AGENTS.md as the current delivery contract. After input is adequate, each completed search round must deliver a photo-based bilingual Chinese/English PDF with requirements, prices, sizing, evidence, scores and manual review order. A blocked or incomplete search must be labelled accordingly, not presented as a completed specification check.

## Before searching

- Apply the SKILL.md input gate first. Text/image/document-only requests are supported. Spreadsheet-specific steps below apply only when a workbook is supplied. Missing budget, measurements or technical specs stay unknown; never borrow defaults from a prior product.

- If a workbook is supplied, confirm the requested Excel row and sheet. OOXML drawing row anchors are zero-based; worksheet row 12 has anchor row 11. Inspect the actual image, not its filename alone.
- Read the row's material, construction, hardware and O-column sample instructions. Locate its own size-guide rows by item name/category; do not reuse the previous product's chart.
- Keep raw values and source-cell coordinates. Suspicious date serials in measurement/tolerance fields are unresolved data, not usable centimetres.
- Distinguish explicit requirements, reference-image observations and assumptions. A product name saying insulated does not specify fill type/weight. Ask about material ambiguities while continuing independent image matching.
- Do not carry the previous product's technical thresholds forward. For example DWR water repellency does not create a 10k hydrostatic/MVTR requirement. Mark scoring categories as applicable from the current requirements; absence in the seller data does not make a required category inapplicable.

## Isolate each run

- Maintain a product-ID-keyed source index containing observed listing/SKU URLs, search and image URLs, local evidence paths, checked timestamps and resume status. Verify saved artifacts before closing tabs. On a user manual-verification handoff, keep only pending challenge tabs; save and close other task tabs. Never treat an attempted slider gesture as a successful challenge without reading the resulting detail page.

- Use a unique run key, e.g. product-search-001. Store evidence under data/RUN-KEY with timestamped records; never overwrite another product's files.
- From the repository root use `node scripts/procurement-browser.mjs RUN-KEY COMMAND [arguments]`. Pass the current lease/tab explicitly. `latest.json` is a pointer; timestamped files retain history.
- Verify runtime connectivity and obtain a valid lease for the task. Historical lease IDs are not reusable configuration.
- Image search cards may omit images outside the viewport. The extractor retains images observed for the same product during that collection, and clears the cache when the search URL changes. Missing images still need visible-page inspection; never substitute a neighbouring image.
- Same photograph is evidence of a reference match, not proof of identical construction or supplier. Keep visual matching separate from keyword scores and specification compliance.

## Details and delivery

- r5 pilot: perform screening and structural comparison from the saved search-card cohort before opening details. Assign every remaining candidate a documented priority, reserve or insufficient-evidence tier. Retention is not an instruction to open every listing. Save a small, product-ID-keyed batch plan and open only that batch; expand from reserves based on findings, not a fixed final top-three cap.
- Check a representative of similar-looking cards first without merging their identities or propagating its specifications. Finish useful evidence capture in one visit; stop further SKU clicks after an explicit requirement conflict. Missing data remains unknown. Check quantities only for variants worth considering; never present untested quantity as confirmed.
- Record actual detail-page openings and human-verification events; do not claim a lower challenge rate from a smaller queue alone. Re-read the current page before handing a challenge to the user, without re-submitting or solving it.

- Use two-stage screening before detail inspection. Collect the loaded cohort without a fixed top-three selection; disclose counts, caps and scope. Model, flat-lay and hanging photos have equal eligibility.
- Reject only explicit visual conflicts with required collar/hood, sleeve type, closure or visibly incompatible texture. Unknown or rear-only views require more evidence. Do not infer composition or technical performance from appearance.
- Record the provided reference-price source (cell or user message), currency and unit. If none is provided, skip price-deviation screening. Otherwise exclude absolute price deviations >=60%, including both boundaries. Conditional out-of-range prices and ambiguous bundle/unit prices remain pending until comparable. Recheck the selected SKU before final eligibility.
- For every retained/pending candidate record matches, differences and unknowns with source-image URLs. Separate visual review priority from procurement compliance scores. Preserve every rejected candidate and reason in the audit.
- Match sizing by BOTH Category and Item Name before reading measurement points, units, size columns and tolerances. Reject date-typed measurements/tolerances as unresolved source errors.

- Inspect a precise colour/style variant before recording price or size data. Save the selected labels, quantity, SKU and timestamp. Clicking an already selected option may deselect it; inspect the resulting state.
- Compare provided target garment measurements with the applicable seller chart. Separate target size from recommended seller order size. If the recommended size changes, independently check its price and quantity availability.
- Before calculating a size recommendation, check chart consistency and measurement definitions. Conflicting tables, implausible long-sleeve lengths, height/weight-only charts or dropped-shoulder versus set-in sleeve differences can prevent a reliable conversion. Keep the recommendation field, explain why it is on hold, and show any limited comparison as such. Never average incompatible charts or turn body-weight ranges into garment measurements. Multiple targets mapping to one seller size require a combined-quantity stock check.
- `scripts/check-procurement-sizes.mjs RUN LEASE TAB PRODUCT SIZE-LABELS-CSV` reads the current selected state first and avoids clicking an already selected size. It saves quantity, SKU, stock wording and evidence under the current run. It currently verifies quantity 1 only; do not claim it verifies larger quantities.
- Read image-based specs as well as text, keeping conflicting labels visible. Shared multi-style descriptions are not automatically SKU-specific evidence.
- Detail images may be inside `descV8-richtext` as well as `descV8-singleImage`. Check both; a small download count does not prove the seller has no size chart. The local media helpers accept a run-directory argument to prevent cross-product mixing.
- Use the repository scoring priority; explain partial scores and skipped categories. Keep unscored but important requirements visible. Reference matching and unknown insulation cannot be hidden by a high numerical score.
- Source files, intermediate data and final PDF must identify the same run. Render every final page; check bilingual meaning, links, calculations, missing glyphs and clipping. Do not reuse a previous PDF by merely changing its title.
- A manual CAPTCHA pauses that page. Ask the user to complete it, preserve the tab, and continue only independent local work while waiting.

Current helpers are not yet a universal one-command procurement application. Do not describe the PDF delivery rule as implemented unattended automation.

- 2026-09-30 r6：正式對照表放寬至五件；依證據選入，少於五件時不湊數。列入比較不代表規格合格；保留未入選與未詳查候選的理由。 / Compare up to five evidence-backed candidates; do not fill slots with unsupported recommendations. Preserve unselected and uninspected candidates with reasons.

- 2026-09-30 r7：纖維配比改採接近度，非完全一致不得一律0分。比例皆以百分比、同一布層及指定款式比較；配比接近度＝各纖維 min(需求比例,商家比例) 加總÷100，乘配比子項權重。新增纖維也列入，不混算面層與裡層。未知、矛盾或未對應款式得證據分0，標記待確認，不能宣稱配比接近度0。GSM獨立計分，g不直接等同g/m²。接近分数與完全符合判定分開，高分不代表性能相同。


- A no-logo requirement is ambiguous: confirm whether it forbids only custom printing or all manufacturer branding. Only apply an unbranded-product gate after the user confirms it. Branded photos cannot prove an unbranded variant; never erase branding to manufacture evidence. Certification/size markings and packaging are separate requirements.
