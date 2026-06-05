const DATA_SOURCE = "./data/allergy.csv";

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

const REQUIRED_COLUMNS = ["id", "category", "name", "note", "updated_at"];
const VALID_ALLERGEN_VALUES = new Set(["あり", "なし", "不明", ""]);
const ALLERGEN_KEYS = Object.keys(ALLERGEN_LABELS);

const state = {
  items: [],
  keyword: "",
  category: "all",
  selectedAllergens: [],
  allergenMode: "contains",
  sort: "default",
  warnings: [],
  loadError: ""
};

const elements = {
  lastUpdated: document.getElementById("last-updated"),
  searchInput: document.getElementById("search-input"),
  categorySelect: document.getElementById("category-select"),
  sortSelect: document.getElementById("sort-select"),
  allergenFilters: document.getElementById("allergen-filters"),
  resultCount: document.getElementById("result-count"),
  messageArea: document.getElementById("message-area"),
  productList: document.getElementById("product-list"),
  resetButton: document.getElementById("reset-button")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  renderAllergenFilters();
  bindEvents();
  await loadCsv();
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.keyword = event.target.value;
    render();
  });

  elements.categorySelect.addEventListener("change", (event) => {
    state.category = event.target.value;
    render();
  });

  elements.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
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

    populateCategoryOptions(state.items);
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

  const headers = rows.shift().map((header) => header.trim());
  return { headers, rows };
}

function normalizeItems(headers, rows) {
  return rows.map((row, index) => {
    const item = { _rowNumber: index + 2, _originalOrder: index, _columnCount: row.length };

    headers.forEach((header, headerIndex) => {
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
  const existingHeaders = new Set(headers);
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

function populateCategoryOptions(items) {
  const categories = Array.from(
    new Set(items.map((item) => item.category).filter(Boolean))
  ).sort((first, second) => first.localeCompare(second, "ja"));

  elements.categorySelect.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "all";
  defaultOption.textContent = "すべて";
  elements.categorySelect.appendChild(defaultOption);

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    elements.categorySelect.appendChild(option);
  });

  elements.categorySelect.value = state.category;
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
  state.sort = "default";

  elements.searchInput.value = "";
  elements.categorySelect.value = "all";
  elements.sortSelect.value = "default";
  document.getElementById("mode-contains").checked = true;
  document.getElementById("mode-excludes").checked = false;
  renderAllergenFilters();
  render();
}

function render() {
  renderMessages();

  if (state.loadError) {
    elements.resultCount.textContent = "0件の商品を表示中";
    elements.productList.replaceChildren();
    return;
  }

  const filteredItems = applyFilters(state.items);
  elements.resultCount.textContent = `${filteredItems.length}件の商品を表示中`;
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

  if (!state.loadError && state.items.length > 0) {
    fragment.appendChild(
      createMessageBox("「含む」と「要確認」を中心に表示しています。詳細は各商品の備考もご確認ください。", "info")
    );
  }

  elements.messageArea.replaceChildren(fragment);
}

function createMessageBox(text, type) {
  const box = document.createElement("div");
  box.className = `status-box ${type}`;
  box.textContent = text;
  return box;
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

  return sortItems(result);
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

function sortItems(items) {
  if (state.sort === "category") {
    return [...items].sort((first, second) => {
      const categoryResult = first.category.localeCompare(second.category, "ja");
      if (categoryResult !== 0) {
        return categoryResult;
      }
      return first.name.localeCompare(second.name, "ja");
    });
  }

  if (state.sort === "name") {
    return [...items].sort((first, second) => first.name.localeCompare(second.name, "ja"));
  }

  return [...items].sort((first, second) => first._originalOrder - second._originalOrder);
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

  const title = document.createElement("h3");
  title.textContent = item.name || "名称未設定";

  const meta = document.createElement("p");
  meta.className = "product-meta";
  meta.textContent = `カテゴリ：${item.category || "未設定"}`;

  card.append(title, meta);

  const allergenSummary = collectAllergenSummary(item);
  card.appendChild(createTagSection("含まれるアレルゲン", allergenSummary.contains, "contains", "含む"));
  card.appendChild(createTagSection("確認が必要", allergenSummary.unknown, "unknown", "要確認"));

  if (allergenSummary.none.length > 0) {
    card.appendChild(createTagSection("含まれない想定", allergenSummary.none, "none", "なし"));
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

  const updated = document.createElement("p");
  updated.className = "updated-text product-section";
  updated.textContent = `更新日：${item.updated_at || "-"}`;
  card.appendChild(updated);

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

function createTagSection(titleText, labels, type, prefix) {
  const section = document.createElement("section");
  section.className = "product-section";

  const title = document.createElement("h4");
  title.textContent = titleText;
  section.appendChild(title);

  if (labels.length === 0) {
    const empty = document.createElement("p");
    empty.className = "note-text";
    empty.textContent = type === "none" ? "表示を省略しています。" : "該当する項目はありません。";
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement("div");
  list.className = "tag-list";

  labels.forEach((labelText) => {
    const tag = document.createElement("span");
    tag.className = `tag ${type}`;

    const prefixText = document.createElement("span");
    prefixText.className = "tag-prefix";
    prefixText.textContent = prefix;

    const valueText = document.createElement("span");
    valueText.textContent = labelText;

    tag.append(prefixText, valueText);
    list.appendChild(tag);
  });

  section.appendChild(list);
  return section;
}
