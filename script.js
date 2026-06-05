const config = window.APP_CONFIG || {};
const DATA_SOURCE = resolveDataSource();

const ALLERGEN_LABELS = {
  egg: "卵",
  milk: "乳",
  wheat: "小麦",
  buckwheat: "そば",
  peanut: "落花生",
  shrimp: "えび",
  crab: "かに",
  walnut: "くるみ",
  cashew: "カシューナッツ",
  almond: "アーモンド",
  abalone: "あわび",
  squid: "いか",
  salmon_roe: "いくら",
  orange: "オレンジ",
  beef: "牛肉",
  kiwi: "キウイフルーツ",
  sesame: "ごま",
  salmon: "さけ",
  mackerel: "さば",
  soybean: "大豆",
  chicken: "鶏肉",
  banana: "バナナ",
  pork: "豚肉",
  matsutake: "まつたけ",
  peach: "もも",
  yam: "やまいも",
  apple: "りんご",
  gelatin: "ゼラチン",
  macadamia: "マカダミアナッツ",
  pistachio: "ピスタチオ"
};

const COLUMN_ALIASES = {
  id: ["id", "ID", "商品ID"],
  category: ["category", "カテゴリ"],
  name: ["name", "商品名"],
  note: ["note", "備考"],
  updated_at: ["updated_at", "更新日", "最終更新日"],
  image: ["image", "画像", "画像URL", "画像パス"],
  image_alt: ["image_alt", "画像説明", "代替テキスト", "画像alt"],
  image_fit: ["image_fit", "画像fit", "画像表示方法"],
  image_position: ["image_position", "画像位置", "画像ポジション"]
};

Object.entries(ALLERGEN_LABELS).forEach(([key, label]) => {
  COLUMN_ALIASES[key] = [key, label];
});

const REQUIRED_COLUMNS = ["id", "category", "name", "note", "updated_at"];
const VALID_ALLERGEN_VALUES = new Set(["あり", "なし", "不明", ""]);
const ALLERGEN_KEYS = Object.keys(ALLERGEN_LABELS);

const state = {
  items: [],
  keyword: "",
  category: "all",
  selectedAllergens: [],
  allergenMode: "contains",
  warnings: [],
  loadError: ""
};

const elements = {
  storeEyebrow: document.getElementById("store-eyebrow"),
  pageTitle: document.getElementById("page-title"),
  heroNote: document.getElementById("hero-note"),
  noticeList: document.getElementById("notice-list"),
  lastUpdated: document.getElementById("last-updated"),
  searchInput: document.getElementById("search-input"),
  categoryChips: document.getElementById("category-chips"),
  allergenFilters: document.getElementById("allergen-filters"),
  resultCount: document.getElementById("result-count"),
  activeFilterSummary: document.getElementById("active-filter-summary"),
  messageArea: document.getElementById("message-area"),
  productList: document.getElementById("product-list"),
  resetButton: document.getElementById("reset-button")
};

document.addEventListener("DOMContentLoaded", init);

function resolveDataSource() {
  const googleSheet = config.googleSheet || {};

  if (googleSheet.enabled && googleSheet.sheetId) {
    const gid = googleSheet.gid || "0";

    // Googleスプレッドシートを公開CSVとして読むURLを組み立てます。
    return `https://docs.google.com/spreadsheets/d/${googleSheet.sheetId}/export?format=csv&gid=${gid}`;
  }

  return config.dataSource || "./data/allergy.csv";
}

async function init() {
  applyConfig();
  renderAllergenFilters();
  bindEvents();
  await loadCsv();
}

function applyConfig() {
  const storeName = config.storeName || "テスト食堂";
  const pageTitle = config.pageTitle || `${storeName} アレルギー表示`;

  document.title = pageTitle;
  elements.storeEyebrow.textContent = config.storeNameEn || storeName;
  elements.pageTitle.textContent = pageTitle;
  elements.heroNote.textContent =
    config.heroNote || "迷ったときはスタッフへお声がけください";

  const notices = Array.isArray(config.noticeLines) && config.noticeLines.length > 0
    ? config.noticeLines
    : [
        "このページは、お客様が商品選択時にアレルゲン情報を確認するためのものです。",
        "調理環境では、他の商品と共通の器具・設備を使用している場合があります。",
        "重度のアレルギーをお持ちのお客様は、必ずスタッフまでお申し出ください。"
      ];

  const fragment = document.createDocumentFragment();
  notices.forEach((line) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = line;
    fragment.appendChild(paragraph);
  });
  elements.noticeList.replaceChildren(fragment);
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.keyword = event.target.value;
    render();
  });

  document.querySelectorAll('input[name="allergen-mode"]').forEach((radio) => {
    radio.addEventListener("change", (event) => {
      state.allergenMode = event.target.value;
      render();
    });
  });

  elements.allergenFilters.addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }

    const next = new Set(state.selectedAllergens);

    if (event.target.checked) {
      next.add(event.target.value);
    } else {
      next.delete(event.target.value);
    }

    state.selectedAllergens = Array.from(next);
    render();
  });

  elements.resetButton.addEventListener("click", resetFilters);
}

async function loadCsv() {
  state.loadError = "";
  state.warnings = [];
  renderMessages();

  try {
    const response = await fetch(DATA_SOURCE, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`CSV request failed: ${response.status}`);
    }

    const csvText = await response.text();
    const { headers, rows } = parseCsv(csvText);
    const normalizedItems = normalizeItems(headers, rows);
    const validation = validateItems(headers, normalizedItems);

    state.items = validation.items;
    state.warnings = validation.warnings;

    renderCategoryChips(state.items);
    updateLastUpdated(state.items);
    render();
  } catch (error) {
    console.error(error);
    state.items = [];
    state.loadError = "アレルギー情報を読み込めませんでした。時間をおいて再度アクセスするか、スタッフまでお声がけください。";
    render();
  }
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(current);
      current = "";
      if (row.some((cell) => cell !== "")) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    current += char;
  }

  if (current !== "" || row.length > 0) {
    row.push(current);
    if (row.some((cell) => cell !== "")) {
      rows.push(row);
    }
  }

  if (rows.length === 0) {
    throw new Error("CSV is empty");
  }

  while (rows.length > 0 && rows[0].every((cell) => cell.trim() === "")) {
    rows.shift();
  }

  if (rows.length === 0) {
    throw new Error("CSV has no header row");
  }

  const headers = rows.shift().map((header) => header.trim());
  return { headers, rows };
}

function resolveHeaderKey(header) {
  const normalized = header.trim();

  for (const [canonicalKey, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(normalized)) {
      return canonicalKey;
    }
  }

  return normalized;
}

function normalizeItems(headers, rows) {
  const resolvedHeaders = headers.map(resolveHeaderKey);

  return rows.map((row, index) => {
    const item = { _rowNumber: index + 2, _originalOrder: index, _columnCount: row.length };

    resolvedHeaders.forEach((header, headerIndex) => {
      item[header] = (row[headerIndex] || "").trim();
    });

    ALLERGEN_KEYS.forEach((key) => {
      if (!(key in item)) {
        item[key] = "";
      }
    });

    return item;
  });
}

function validateItems(headers, items) {
  const warnings = [];
  const existingHeaders = new Set(headers.map(resolveHeaderKey));
  const missingRequired = REQUIRED_COLUMNS.filter((column) => !existingHeaders.has(column));

  if (missingRequired.length > 0) {
    warnings.push(`必須カラムが不足しています: ${missingRequired.join(", ")}`);
  }

  const duplicateIds = new Set();
  const seenIds = new Set();

  items.forEach((item) => {
    if (item._columnCount !== headers.length) {
      warnings.push(
        `${item._rowNumber}行目: 列数が ${item._columnCount} 個です。ヘッダーは ${headers.length} 個です。`
      );
    }

    if (!item.id) {
      warnings.push(`${item._rowNumber}行目: id が空です。`);
    }

    if (!item.name) {
      warnings.push(`${item._rowNumber}行目: name が空です。`);
    }

    if (item.id && seenIds.has(item.id)) {
      duplicateIds.add(item.id);
    }
    seenIds.add(item.id);

    ALLERGEN_KEYS.forEach((key) => {
      const value = item[key];
      if (!VALID_ALLERGEN_VALUES.has(value)) {
        warnings.push(`${item._rowNumber}行目: ${key} の値 "${value}" は不正です。`);
      }

      if (value === "") {
        warnings.push(`${item._rowNumber}行目: ${key} が空欄のため「要確認」として扱います。`);
      }
    });
  });

  if (duplicateIds.size > 0) {
    warnings.push(`重複している id があります: ${Array.from(duplicateIds).join(", ")}`);
  }

  warnings.forEach((warning) => console.warn(warning));

  return { items, warnings };
}

function getCategories(items) {
  return Array.from(
    new Set(items.map((item) => item.category).filter(Boolean))
  ).sort((first, second) => first.localeCompare(second, "ja"));
}

function renderCategoryChips(items) {
  const categories = getCategories(items);
  const fragment = document.createDocumentFragment();

  [{ value: "all", label: "すべて" }, ...categories.map((category) => ({ value: category, label: category }))].forEach((entry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip-button${state.category === entry.value ? " is-active" : ""}`;
    button.textContent = entry.label;
    button.setAttribute("aria-pressed", String(state.category === entry.value));
    button.addEventListener("click", () => {
      state.category = entry.value;
      renderCategoryChips(state.items);
      render();
    });
    fragment.appendChild(button);
  });

  elements.categoryChips.replaceChildren(fragment);
}

function populateCategoryOptions(items) {
  const categories = Array.from(
    new Set(items.map((item) => item.category).filter(Boolean))
  ).sort((first, second) => first.localeCompare(second, "ja"));
  return categories;
}

function renderAllergenFilters() {
  const fragment = document.createDocumentFragment();

  ALLERGEN_KEYS.forEach((key) => {
    const label = document.createElement("label");
    label.className = "check-pill";
    label.htmlFor = `allergen-${key}`;

    const input = document.createElement("input");
    input.id = `allergen-${key}`;
    input.type = "checkbox";
    input.value = key;
    input.checked = state.selectedAllergens.includes(key);

    const text = document.createElement("span");
    text.textContent = ALLERGEN_LABELS[key];

    label.append(input, text);
    fragment.appendChild(label);
  });

  elements.allergenFilters.replaceChildren(fragment);
}

function updateLastUpdated(items) {
  const dates = items
    .map((item) => item.updated_at)
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort();

  const latest = dates.length > 0 ? dates[dates.length - 1] : "-";
  elements.lastUpdated.textContent = `最終更新日：${latest}`;
}

function resetFilters() {
  state.keyword = "";
  state.category = "all";
  state.selectedAllergens = [];
  state.allergenMode = "contains";

  elements.searchInput.value = "";
  document.getElementById("mode-contains").checked = true;
  document.getElementById("mode-excludes").checked = false;
  renderCategoryChips(state.items);
  renderAllergenFilters();
  render();
}

function render() {
  renderMessages();

  if (state.loadError) {
    elements.resultCount.textContent = "0件の商品を表示中";
    elements.activeFilterSummary.replaceChildren();
    elements.productList.replaceChildren();
    return;
  }

  const filteredItems = applyFilters(state.items);
  elements.resultCount.textContent = `${filteredItems.length}件の商品を表示中`;
  renderActiveFilterSummary();
  renderItems(filteredItems);
}

function renderMessages() {
  const fragment = document.createDocumentFragment();

  if (state.loadError) {
    fragment.appendChild(createMessageBox(state.loadError, "error"));
  }

  if (!state.loadError && state.warnings.length > 0) {
    const warningText = [
      "CSVに確認が必要な項目があります。",
      state.warnings.join(" ")
    ].join(" ");
    fragment.appendChild(createMessageBox(warningText, "warning"));
  }

  elements.messageArea.replaceChildren(fragment);
}

function createMessageBox(text, type) {
  const box = document.createElement("div");
  box.className = `status-box ${type}`;
  box.textContent = text;
  return box;
}

function renderActiveFilterSummary() {
  const chips = [];

  if (state.keyword.trim()) {
    chips.push(`検索: ${state.keyword.trim()}`);
  }

  if (state.category !== "all") {
    chips.push(`カテゴリ: ${state.category}`);
  }

  if (state.selectedAllergens.length > 0) {
    const labels = state.selectedAllergens.map((key) => ALLERGEN_LABELS[key]).join("・");
    const modeLabel = state.allergenMode === "excludes" ? "含まない" : "含む";
    chips.push(`アレルゲン: ${labels} を${modeLabel}`);
  }

  if (chips.length === 0) {
    elements.activeFilterSummary.replaceChildren();
    return;
  }

  const fragment = document.createDocumentFragment();
  chips.forEach((chipText) => {
    const chip = document.createElement("span");
    chip.className = "summary-chip";
    chip.textContent = chipText;
    fragment.appendChild(chip);
  });

  elements.activeFilterSummary.replaceChildren(fragment);
}

function applyFilters(items) {
  let result = [...items];

  const tokens = state.keyword.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length > 0) {
    result = result.filter((item) => {
      const searchableText = buildSearchText(item);
      return tokens.every((token) => searchableText.includes(token));
    });
  }

  if (state.category !== "all") {
    result = result.filter((item) => item.category === state.category);
  }

  if (state.selectedAllergens.length > 0) {
    result = result.filter((item) => matchesAllergenFilter(item));
  }

  return result.sort((first, second) => first._originalOrder - second._originalOrder);
}

function buildSearchText(item) {
  const allergenNames = ALLERGEN_KEYS
    .filter((key) => normalizeAllergenValue(item[key]) === "あり")
    .map((key) => ALLERGEN_LABELS[key]);

  return [
    item.name,
    item.category,
    item.note,
    ...allergenNames
  ].join(" ").toLocaleLowerCase();
}

function matchesAllergenFilter(item) {
  return state.selectedAllergens.every((key) => {
    const value = normalizeAllergenValue(item[key]);
    if (state.allergenMode === "excludes") {
      return value === "なし";
    }
    return value === "あり";
  });
}

function normalizeAllergenValue(value) {
  if (value === "あり" || value === "なし" || value === "不明") {
    return value;
  }
  return "不明";
}

function renderItems(items) {
  const fragment = document.createDocumentFragment();

  if (items.length === 0) {
    fragment.appendChild(
      createMessageBox("条件に一致する商品がありません。検索条件を変更してください。", "info")
    );
    elements.productList.replaceChildren(fragment);
    return;
  }

  items.forEach((item) => {
    fragment.appendChild(createProductCard(item));
  });

  elements.productList.replaceChildren(fragment);
}

function createProductCard(item) {
  const card = document.createElement("article");
  card.className = "product-card";

  if (item.image) {
    const media = document.createElement("div");
    media.className = "product-media";
    const image = document.createElement("img");
    image.className = "product-image";
    image.src = item.image;
    image.alt = item.image_alt || `${item.name || "商品"}のイメージ`;
    image.loading = "lazy";
    image.decoding = "async";
    image.style.objectFit = item.image_fit || "cover";
    image.style.objectPosition = item.image_position || "center";
    media.appendChild(image);
    card.appendChild(media);
  }

  const header = document.createElement("div");
  header.className = "product-header";

  const titleBlock = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = item.name || "名称未設定";
  const meta = document.createElement("p");
  meta.className = "product-meta";
  meta.textContent = item.updated_at ? `更新日: ${item.updated_at}` : "更新日: -";
  titleBlock.append(title, meta);

  const categoryBadge = document.createElement("span");
  categoryBadge.className = "category-badge";
  categoryBadge.textContent = item.category || "未設定";

  header.append(titleBlock, categoryBadge);
  card.appendChild(header);

  const allergenSummary = collectAllergenSummary(item);
  card.appendChild(createTagSection("含まれるアレルゲン", allergenSummary.contains, "contains"));
  if (allergenSummary.unknown.length > 0) {
    card.appendChild(createTagSection("確認が必要", allergenSummary.unknown, "unknown"));
  }

  if (allergenSummary.none.length > 0) {
    const details = document.createElement("details");
    details.className = "detail-toggle";
    const summary = document.createElement("summary");
    summary.textContent = "含まれない想定の項目を見る";
    details.append(summary, createTagSection("含まれない想定", allergenSummary.none, "none"));
    card.appendChild(details);
  }

  const noteSection = document.createElement("section");
  noteSection.className = "product-section";
  const noteTitle = document.createElement("h4");
  noteTitle.textContent = "備考";
  const noteText = document.createElement("p");
  noteText.className = "note-text";
  noteText.textContent = item.note || "特記事項はありません。";
  noteSection.append(noteTitle, noteText);
  card.appendChild(noteSection);

  return card;
}

function collectAllergenSummary(item) {
  const summary = { contains: [], unknown: [], none: [] };

  ALLERGEN_KEYS.forEach((key) => {
    const label = ALLERGEN_LABELS[key];
    const value = normalizeAllergenValue(item[key]);

    if (value === "あり") {
      summary.contains.push(label);
    } else if (value === "なし") {
      summary.none.push(label);
    } else {
      summary.unknown.push(label);
    }
  });

  return summary;
}

function createTagSection(titleText, labels, type) {
  const section = document.createElement("section");
  section.className = "product-section";

  const title = document.createElement("h4");
  title.textContent = titleText;
  section.appendChild(title);

  if (labels.length === 0) {
    const empty = document.createElement("p");
    empty.className = "note-text";
    empty.textContent = type === "none" ? "表示を省略しています。" : "該当項目はありません。";
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement("div");
  list.className = "tag-list";

  labels.forEach((labelText) => {
    const tag = document.createElement("span");
    tag.className = `tag ${type}`;
    tag.textContent = labelText;
    list.appendChild(tag);
  });

  section.appendChild(list);
  return section;
}
