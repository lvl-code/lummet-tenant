// ============================================
// RESEARCH CONTENT — visual section builder
// Replaces raw-JSON authoring with pick-a-type, fill-a-form
// cards, same pattern as wireSeoSectionBuilder/renderSeoSections
// used by countries/categories, adapted for research's own
// section types (see renderResearchSections in controllers.js —
// this UI produces exactly the JSON shape that renderer expects,
// the editor just never has to see or write that JSON directly).
// ============================================

const researchSectionState = { sections: [], editingItemId: null };

const RESEARCH_SECTION_TYPES = [
  "heading", "rich_text", "statistic", "timeline", "table",
  "source_citation", "fact_card", "faq", "internal_links",
  "research_reference", "dataset_table", "image"
];

const RESEARCH_SECTION_TYPE_LABELS = {
  heading: "Heading",
  rich_text: "Rich Text",
  statistic: "Statistic",
  timeline: "Timeline",
  table: "Table",
  source_citation: "Source Citation",
  fact_card: "Fact Card",
  faq: "FAQ",
  internal_links: "Internal Links",
  research_reference: "Research Reference",
  dataset_table: "Dataset Table",
  image: "Image"
};

// ---- shared caches (loaded once, reused by every section card) ----

let _researchAllItemsCache = null;
async function fetchResearchItemsCached(force = false) {
  if (_researchAllItemsCache && !force) return _researchAllItemsCache;
  try {
    const res = await fetch("/en/api/v1/research/list");
    const data = await res.json();
    _researchAllItemsCache = data.research || [];
  } catch { _researchAllItemsCache = []; }
  return _researchAllItemsCache;
}

let _researchAllDatasetsCache = null;
async function fetchResearchDatasetsCached(force = false) {
  if (_researchAllDatasetsCache && !force) return _researchAllDatasetsCache;
  try {
    const res = await fetch("/en/api/v1/research-datasets/list");
    const data = await res.json();
    _researchAllDatasetsCache = data.datasets || [];
  } catch { _researchAllDatasetsCache = []; }
  return _researchAllDatasetsCache;
}

async function fetchResearchDatasetVersionsFor(datasetId) {
  try {
    const res = await fetch(`/en/api/v1/research-datasets/versions?dataset_id=${datasetId}`);
    const data = await res.json();
    return data.versions || [];
  } catch { return []; }
}

// Every rich-text-capable textarea this builder renders gets an id
// in this shape so init/destroy can find exactly its own editors
// without touching any other page's RichEditor instances.
function researchEditorIdFor(sectionIndex, field) {
  return `research-sec-${sectionIndex}-${field}`;
}

function destroyResearchSectionEditors() {
  const root = document.getElementById("researchFormSections");
  if (!root || !window.RichEditor) return;
  root.querySelectorAll("textarea[data-editor-id]").forEach((ta) => {
    RichEditor.destroy(ta.dataset.editorId);
  });
}

function initResearchSectionEditors() {
  const root = document.getElementById("researchFormSections");
  if (!root || !window.RichEditor) return;
  root.querySelectorAll("textarea[data-rich-field]").forEach((ta) => {
    RichEditor.init(ta, { height: 220 });
  });
}

function researchEditorValue(sectionIndex, field, fallbackEl) {
  const editorId = researchEditorIdFor(sectionIndex, field);
  if (window.RichEditor && RichEditor.isReady(editorId)) return RichEditor.get(editorId);
  return fallbackEl ? fallbackEl.value : "";
}

// ---- per-type card body renderers ----
// Each returns the INNER html for a section card (the type
// selector + remove/move controls are added by
// researchSectionCardHtml, shared across every type).

function researchRichTextarea(index, field, value, label, rows) {
  const id = researchEditorIdFor(index, field);
  return `<label>${label}</label><textarea data-editor-id="${id}" data-rich-field data-section-field="${field}" rows="${rows || 6}">${escapeHtml(value || "")}</textarea>`;
}

function researchFieldsHtml_heading(s) {
  return `<label>Heading text</label><input type="text" data-section-field="title" value="${escapeHtml(s.title || "")}" placeholder="e.g. Regulatory Framework">`;
}

function researchFieldsHtml_rich_text(s, index) {
  return `
    <label>Section title (optional)</label>
    <input type="text" data-section-field="title" value="${escapeHtml(s.title || "")}">
    <label>Subtitle (optional)</label>
    <input type="text" data-section-field="subtitle" value="${escapeHtml(s.subtitle || "")}">
    ${researchRichTextarea(index, "body", s.body, "Body")}`;
}

function researchFieldsHtml_statistic(s) {
  return `
    <label>Section title (optional)</label>
    <input type="text" data-section-field="title" value="${escapeHtml(s.title || "")}">
    <div class="form-row">
      <div class="form-group"><label>Value</label><input type="text" data-section-field="value" value="${escapeHtml(s.value ?? "")}" placeholder="30.5"></div>
      <div class="form-group"><label>Unit</label><input type="text" data-section-field="unit" value="${escapeHtml(s.unit || "")}" placeholder="%"></div>
    </div>
    <label>Label</label>
    <input type="text" data-section-field="label" value="${escapeHtml(s.label || "")}" placeholder="Gambling tax rate">
    <label>Context (optional)</label>
    <input type="text" data-section-field="context" value="${escapeHtml(s.context || "")}" placeholder="Applied to gross gaming revenue.">`;
}

function researchTimelineEventRow(ev, i) {
  return `
    <div class="research-subrow" data-event-row="${i}">
      <div class="research-subrow__head">
        <input type="date" data-event-field="date" value="${escapeHtml(ev.date || "")}" style="max-width:160px">
        <input type="text" data-event-field="title" value="${escapeHtml(ev.title || "")}" placeholder="Event title" style="flex:1">
        <button type="button" class="btn btn--ghost btn--sm" data-remove-event>Remove</button>
      </div>
      <textarea data-event-field="description" rows="2" placeholder="Description (optional)">${escapeHtml(ev.description || "")}</textarea>
    </div>`;
}

function researchFieldsHtml_timeline(s) {
  const events = Array.isArray(s.events) ? s.events : [];
  return `
    <label>Section title (optional)</label>
    <input type="text" data-section-field="title" value="${escapeHtml(s.title || "")}">
    <label>Events</label>
    <div data-events-container>${events.map(researchTimelineEventRow).join("")}</div>
    <button type="button" class="btn btn--ghost btn--sm" data-add-event>+ Add event</button>`;
}

function researchTableRow(row, columns, rowIndex) {
  const cells = columns.map((col, ci) =>
    `<input type="text" data-cell-field="${ci}" value="${escapeHtml(row[ci] ?? "")}" placeholder="${escapeHtml(col || "Column " + (ci + 1))}" style="flex:1;min-width:80px">`
  ).join("");
  return `<div class="research-subrow" data-table-row="${rowIndex}" style="display:flex;gap:6px;align-items:center">${cells}<button type="button" class="btn btn--ghost btn--sm" data-remove-row>✕</button></div>`;
}

function researchFieldsHtml_table(s) {
  const columns = Array.isArray(s.columns) ? s.columns : [];
  const rows = Array.isArray(s.rows) ? s.rows : [];
  return `
    <label>Section title (optional)</label>
    <input type="text" data-section-field="title" value="${escapeHtml(s.title || "")}">
    <label>Caption (optional)</label>
    <input type="text" data-section-field="caption" value="${escapeHtml(s.caption || "")}">
    <label>Columns <span class="muted">(one per box — this is the header row)</span></label>
    <div data-columns-container style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
      ${columns.map((c, i) => `<input type="text" data-column-field="${i}" value="${escapeHtml(c || "")}" placeholder="Column ${i + 1}" style="width:120px">`).join("")}
    </div>
    <button type="button" class="btn btn--ghost btn--sm" data-add-column>+ Add column</button>
    <label style="margin-top:10px">Rows</label>
    <div data-table-rows-container>${rows.map((r, i) => researchTableRow(r, columns, i)).join("")}</div>
    <button type="button" class="btn btn--ghost btn--sm" data-add-row>+ Add row</button>`;
}

function researchFieldsHtml_source_citation(s, index, sourcesList) {
  const options = (sourcesList || []).map((src) =>
    `<option value="${src.id}" ${String(s.source_id) === String(src.id) ? "selected" : ""}>${escapeHtml(src.organisation)}${src.title ? " — " + escapeHtml(src.title) : ""}</option>`
  ).join("");
  return `
    <label>Statement</label>
    <textarea data-section-field="body" rows="2" placeholder="What the source supports">${escapeHtml(s.body || "")}</textarea>
    <label>Source</label>
    <select data-section-field="source_id">
      <option value="">— Choose a source (from the Sources library below) —</option>
      ${options}
    </select>
    <p class="muted" style="margin:4px 0 0">Don't see the source you need? Add it in the Sources section further down this page, then come back and pick it here.</p>`;
}

function researchFieldsHtml_fact_card(s, index) {
  return `
    <label>Card title (optional)</label>
    <input type="text" data-section-field="title" value="${escapeHtml(s.title || "")}">
    ${researchRichTextarea(index, "body", s.body, "Card content")}`;
}

function researchFaqItemRow(item, i) {
  return `
    <div class="research-subrow" data-faq-row="${i}">
      <div class="research-subrow__head">
        <input type="text" data-faq-field="q" value="${escapeHtml(item.q || "")}" placeholder="Question" style="flex:1">
        <button type="button" class="btn btn--ghost btn--sm" data-remove-faq>Remove</button>
      </div>
      <textarea data-faq-field="a" rows="2" placeholder="Answer">${escapeHtml(item.a || "")}</textarea>
    </div>`;
}

function researchFieldsHtml_faq(s) {
  const items = Array.isArray(s.items) ? s.items : [];
  return `
    <label>Section title (optional)</label>
    <input type="text" data-section-field="title" value="${escapeHtml(s.title || "FAQ")}">
    <label>Questions</label>
    <div data-faq-container>${items.map(researchFaqItemRow).join("")}</div>
    <button type="button" class="btn btn--ghost btn--sm" data-add-faq>+ Add question</button>`;
}

function researchLinkRow(link, i) {
  return `
    <div class="research-subrow" data-link-row="${i}" style="display:flex;gap:6px;align-items:center">
      <input type="text" data-link-field="label" value="${escapeHtml(link.label || "")}" placeholder="Link text" style="flex:1">
      <input type="text" data-link-field="url" value="${escapeHtml(link.url || "")}" placeholder="/en/research/..." style="flex:1">
      <button type="button" class="btn btn--ghost btn--sm" data-remove-link>✕</button>
    </div>`;
}

function researchFieldsHtml_internal_links(s) {
  const links = Array.isArray(s.links) ? s.links : [];
  return `
    <label>Section title (optional)</label>
    <input type="text" data-section-field="title" value="${escapeHtml(s.title || "Related reading")}">
    <label>Links</label>
    <div data-links-container>${links.map(researchLinkRow).join("")}</div>
    <button type="button" class="btn btn--ghost btn--sm" data-add-link>+ Add link</button>`;
}

function researchFieldsHtml_research_reference(s, index, itemsList) {
  const mode = s.mode === "snapshot" ? "snapshot" : "live";
  const options = (itemsList || [])
    .filter((it) => String(it.id) !== String(researchSectionState.editingItemId || ""))
    .map((it) => `<option value="${it.id}" ${String(s.research_item_id) === String(it.id) ? "selected" : ""}>${escapeHtml(it.title)} (${it.type})</option>`)
    .join("");
  return `
    <label>Which research item?</label>
    <select data-section-field="research_item_id" data-ref-item-select>
      <option value="">— Choose a research item —</option>
      ${options}
    </select>
    <label style="margin-top:8px">Mode</label>
    <select data-section-field="mode">
      <option value="live" ${mode === "live" ? "selected" : ""}>Live — always shows the current published version</option>
      <option value="snapshot" ${mode === "snapshot" ? "selected" : ""}>Snapshot — frozen text, captured now</option>
    </select>
    <div data-snapshot-fields style="${mode === "snapshot" ? "" : "display:none"};margin-top:8px">
      <button type="button" class="btn btn--ghost btn--sm" data-fetch-snapshot>Fetch current text from selected item &amp; freeze it here</button>
      <label style="margin-top:8px">Frozen title</label>
      <input type="text" data-section-field="snapshot_title" value="${escapeHtml(s.snapshot_title || "")}">
      <label>Frozen excerpt</label>
      <textarea data-section-field="snapshot_excerpt" rows="2">${escapeHtml(s.snapshot_excerpt || "")}</textarea>
      <label>Snapshot date</label>
      <input type="date" data-section-field="snapshot_at" value="${escapeHtml(s.snapshot_at || "")}">
    </div>`;
}

function researchFieldsHtml_dataset_table(s, index, datasetsList) {
  const options = (datasetsList || []).map((d) =>
    `<option value="${d.id}" ${String(s.dataset_id) === String(d.id) ? "selected" : ""}>${escapeHtml(d.title)}</option>`
  ).join("");
  return `
    <label>Dataset</label>
    <select data-section-field="dataset_id" data-dataset-select>
      <option value="">— Choose a dataset (from the Research Datasets page) —</option>
      ${options}
    </select>
    <label style="margin-top:8px">Version</label>
    <select data-section-field="version" data-dataset-version-select>
      <option value="latest" ${(!s.version || s.version === "latest") ? "selected" : ""}>Latest (always current)</option>
    </select>
    <label style="margin-top:8px">Caption (optional)</label>
    <input type="text" data-section-field="caption" value="${escapeHtml(s.caption || "")}">`;
}

function researchFieldsHtml_image(s) {
  return `
    <label>Caption / alt text</label>
    <input type="text" data-section-field="title" value="${escapeHtml(s.title || "")}">
    <label>Image URL</label>
    <input type="text" data-section-field="image" value="${escapeHtml(s.image || "")}" placeholder="Paste a URL from the Media Library page">`;
}

function researchSectionCardHtml(section, index, caches) {
  const type = RESEARCH_SECTION_TYPES.includes(section.type) ? section.type : "rich_text";
  const builders = {
    heading: () => researchFieldsHtml_heading(section),
    rich_text: () => researchFieldsHtml_rich_text(section, index),
    statistic: () => researchFieldsHtml_statistic(section),
    timeline: () => researchFieldsHtml_timeline(section),
    table: () => researchFieldsHtml_table(section),
    source_citation: () => researchFieldsHtml_source_citation(section, index, caches.sources),
    fact_card: () => researchFieldsHtml_fact_card(section, index),
    faq: () => researchFieldsHtml_faq(section),
    internal_links: () => researchFieldsHtml_internal_links(section),
    research_reference: () => researchFieldsHtml_research_reference(section, index, caches.items),
    dataset_table: () => researchFieldsHtml_dataset_table(section, index, caches.datasets),
    image: () => researchFieldsHtml_image(section)
  };

  return `
    <div class="research-section-card" data-section-row="${index}">
      <div class="research-section-card__head">
        <span class="research-section-card__badge">#${index + 1}</span>
        <select data-section-type>
          ${RESEARCH_SECTION_TYPES.map((t) => `<option value="${t}" ${t === type ? "selected" : ""}>${RESEARCH_SECTION_TYPE_LABELS[t]}</option>`).join("")}
        </select>
        <button type="button" class="btn btn--ghost btn--sm" data-move-section-up ${index === 0 ? "disabled" : ""}>↑</button>
        <button type="button" class="btn btn--ghost btn--sm" data-move-section-down>↓</button>
        <button type="button" class="btn btn--danger btn--sm" data-remove-section style="margin-left:auto">Remove section</button>
      </div>
      ${builders[type] ? builders[type]() : ""}
    </div>`;
}

async function renderResearchFormSections() {
  const root = document.getElementById("researchFormSections");
  if (!root) return;

  destroyResearchSectionEditors();

  const [sources, datasets, items] = await Promise.all([
    fetchSourcesCached(),
    fetchResearchDatasetsCached(),
    fetchResearchItemsCached()
  ]);
  const caches = { sources, datasets, items };

  if (researchSectionState.sections.length === 0) {
    root.innerHTML = '<p class="muted">No sections yet — use "+ Add Section" below, or a quick-start template above.</p>';
    return;
  }

  root.innerHTML = researchSectionState.sections.map((s, i) => researchSectionCardHtml(s, i, caches)).join("");
  initResearchSectionEditors();

  // Dataset version dropdowns need each dataset's real version list,
  // fetched per-section since it depends on which dataset is picked.
  root.querySelectorAll("[data-dataset-select]").forEach(async (sel) => {
    if (!sel.value) return;
    const versions = await fetchResearchDatasetVersionsFor(sel.value);
    const versionSelect = sel.closest(".research-section-card").querySelector("[data-dataset-version-select]");
    const currentSection = researchSectionState.sections[Number(sel.closest("[data-section-row]").dataset.sectionRow)];
    const currentVersion = currentSection ? currentSection.version : "latest";
    versionSelect.innerHTML = '<option value="latest">Latest (always current)</option>' +
      versions.map((v) => `<option value="${v.version_number}" ${String(currentVersion) === String(v.version_number) ? "selected" : ""}>v${v.version_number} — ${(v.created_at || "").slice(0, 10)}</option>`).join("");
  });
}

function syncResearchSectionsFromDom() {
  const root = document.getElementById("researchFormSections");
  if (!root) return;
  const rows = Array.from(root.querySelectorAll("[data-section-row]"));

  researchSectionState.sections = rows.map((row) => {
    const index = Number(row.dataset.sectionRow);
    const existing = researchSectionState.sections[index] || {};
    const type = row.querySelector("[data-section-type]").value;
    const section = { id: existing.id || ("rs" + Date.now() + index), type };

    row.querySelectorAll("[data-section-field]").forEach((el) => {
      const key = el.dataset.sectionField;
      if (el.dataset.richField !== undefined) {
        section[key] = researchEditorValue(index, key, el);
      } else {
        section[key] = el.value;
      }
    });

    // Repeatable sub-lists — each lives in its own container, read
    // separately from the flat data-section-field loop above.
    const eventsContainer = row.querySelector("[data-events-container]");
    if (eventsContainer) {
      section.events = Array.from(eventsContainer.querySelectorAll("[data-event-row]")).map((er) => ({
        date: er.querySelector("[data-event-field='date']").value,
        title: er.querySelector("[data-event-field='title']").value,
        description: er.querySelector("[data-event-field='description']").value
      }));
    }

    const faqContainer = row.querySelector("[data-faq-container]");
    if (faqContainer) {
      section.items = Array.from(faqContainer.querySelectorAll("[data-faq-row]")).map((fr) => ({
        q: fr.querySelector("[data-faq-field='q']").value,
        a: fr.querySelector("[data-faq-field='a']").value
      }));
    }

    const linksContainer = row.querySelector("[data-links-container]");
    if (linksContainer) {
      section.links = Array.from(linksContainer.querySelectorAll("[data-link-row]")).map((lr) => ({
        label: lr.querySelector("[data-link-field='label']").value,
        url: lr.querySelector("[data-link-field='url']").value
      }));
    }

    const columnsContainer = row.querySelector("[data-columns-container]");
    if (columnsContainer) {
      section.columns = Array.from(columnsContainer.querySelectorAll("[data-column-field]")).map((c) => c.value);
    }
    const tableRowsContainer = row.querySelector("[data-table-rows-container]");
    if (tableRowsContainer) {
      section.rows = Array.from(tableRowsContainer.querySelectorAll("[data-table-row]")).map((tr) =>
        Array.from(tr.querySelectorAll("[data-cell-field]")).map((c) => c.value)
      );
    }

    return section;
  });
}

function researchDefaultSectionFor(type) {
  const defaults = {
    heading: { title: "" },
    rich_text: { title: "", subtitle: "", body: "" },
    statistic: { title: "", value: "", unit: "", label: "", context: "" },
    timeline: { title: "", events: [] },
    table: { title: "", caption: "", columns: [], rows: [] },
    source_citation: { body: "", source_id: "" },
    fact_card: { title: "", body: "" },
    faq: { title: "FAQ", items: [] },
    internal_links: { title: "Related reading", links: [] },
    research_reference: { mode: "live", research_item_id: "" },
    dataset_table: { dataset_id: "", version: "latest", caption: "" },
    image: { title: "", image: "" }
  };
  return { id: "rs" + Date.now(), type, ...(defaults[type] || {}) };
}

function wireResearchSectionBuilder() {
  const root = document.getElementById("researchFormSections");
  const addBtn = document.getElementById("researchAddSectionBtn");
  const addTypeSelect = document.getElementById("researchAddSectionType");
  if (!root || root.dataset.wired === "true") return;
  root.dataset.wired = "true";

  if (addBtn) {
    addBtn.addEventListener("click", () => {
      syncResearchSectionsFromDom();
      researchSectionState.sections.push(researchDefaultSectionFor(addTypeSelect.value));
      renderResearchFormSections();
    });
  }

  root.addEventListener("click", async (e) => {
    const sectionRowEl = e.target.closest("[data-section-row]");

    if (e.target.closest("[data-remove-section]")) {
      syncResearchSectionsFromDom();
      researchSectionState.sections.splice(Number(sectionRowEl.dataset.sectionRow), 1);
      renderResearchFormSections();
      return;
    }
    if (e.target.closest("[data-move-section-up]")) {
      syncResearchSectionsFromDom();
      const i = Number(sectionRowEl.dataset.sectionRow);
      if (i > 0) {
        const [moved] = researchSectionState.sections.splice(i, 1);
        researchSectionState.sections.splice(i - 1, 0, moved);
        renderResearchFormSections();
      }
      return;
    }
    if (e.target.closest("[data-move-section-down]")) {
      syncResearchSectionsFromDom();
      const i = Number(sectionRowEl.dataset.sectionRow);
      if (i < researchSectionState.sections.length - 1) {
        const [moved] = researchSectionState.sections.splice(i, 1);
        researchSectionState.sections.splice(i + 1, 0, moved);
        renderResearchFormSections();
      }
      return;
    }
    if (e.target.closest("[data-add-event]")) {
      syncResearchSectionsFromDom();
      const i = Number(sectionRowEl.dataset.sectionRow);
      if (!Array.isArray(researchSectionState.sections[i].events)) researchSectionState.sections[i].events = [];
      researchSectionState.sections[i].events.push({ date: "", title: "", description: "" });
      renderResearchFormSections();
      return;
    }
    if (e.target.closest("[data-remove-event]")) {
      syncResearchSectionsFromDom();
      const i = Number(sectionRowEl.dataset.sectionRow);
      const j = Number(e.target.closest("[data-event-row]").dataset.eventRow);
      researchSectionState.sections[i].events.splice(j, 1);
      renderResearchFormSections();
      return;
    }
    if (e.target.closest("[data-add-faq]")) {
      syncResearchSectionsFromDom();
      const i = Number(sectionRowEl.dataset.sectionRow);
      if (!Array.isArray(researchSectionState.sections[i].items)) researchSectionState.sections[i].items = [];
      researchSectionState.sections[i].items.push({ q: "", a: "" });
      renderResearchFormSections();
      return;
    }
    if (e.target.closest("[data-remove-faq]")) {
      syncResearchSectionsFromDom();
      const i = Number(sectionRowEl.dataset.sectionRow);
      const j = Number(e.target.closest("[data-faq-row]").dataset.faqRow);
      researchSectionState.sections[i].items.splice(j, 1);
      renderResearchFormSections();
      return;
    }
    if (e.target.closest("[data-add-link]")) {
      syncResearchSectionsFromDom();
      const i = Number(sectionRowEl.dataset.sectionRow);
      if (!Array.isArray(researchSectionState.sections[i].links)) researchSectionState.sections[i].links = [];
      researchSectionState.sections[i].links.push({ label: "", url: "" });
      renderResearchFormSections();
      return;
    }
    if (e.target.closest("[data-remove-link]")) {
      syncResearchSectionsFromDom();
      const i = Number(sectionRowEl.dataset.sectionRow);
      const j = Number(e.target.closest("[data-link-row]").dataset.linkRow);
      researchSectionState.sections[i].links.splice(j, 1);
      renderResearchFormSections();
      return;
    }
    if (e.target.closest("[data-add-column]")) {
      syncResearchSectionsFromDom();
      const i = Number(sectionRowEl.dataset.sectionRow);
      if (!Array.isArray(researchSectionState.sections[i].columns)) researchSectionState.sections[i].columns = [];
      researchSectionState.sections[i].columns.push("");
      renderResearchFormSections();
      return;
    }
    if (e.target.closest("[data-add-row]")) {
      syncResearchSectionsFromDom();
      const i = Number(sectionRowEl.dataset.sectionRow);
      const colCount = (researchSectionState.sections[i].columns || []).length;
      if (!Array.isArray(researchSectionState.sections[i].rows)) researchSectionState.sections[i].rows = [];
      researchSectionState.sections[i].rows.push(new Array(colCount).fill(""));
      renderResearchFormSections();
      return;
    }
    if (e.target.closest("[data-remove-row]")) {
      syncResearchSectionsFromDom();
      const i = Number(sectionRowEl.dataset.sectionRow);
      const j = Number(e.target.closest("[data-table-row]").dataset.tableRow);
      researchSectionState.sections[i].rows.splice(j, 1);
      renderResearchFormSections();
      return;
    }
    if (e.target.closest("[data-fetch-snapshot]")) {
      const i = Number(sectionRowEl.dataset.sectionRow);
      const refSelect = sectionRowEl.querySelector("[data-ref-item-select]");
      const refId = refSelect ? refSelect.value : "";
      if (!refId) { alert("Choose a research item first."); return; }
      try {
        const res = await fetch(`/en/api/v1/research/get-by-id?id=${refId}`);
        const data = await res.json();
        if (!data.success) { alert(data.error || "Could not load that item"); return; }
        syncResearchSectionsFromDom();
        researchSectionState.sections[i].research_item_id = refId;
        researchSectionState.sections[i].snapshot_title = data.item.title || "";
        researchSectionState.sections[i].snapshot_excerpt = data.item.excerpt || "";
        researchSectionState.sections[i].snapshot_at = new Date().toISOString().slice(0, 10);
        renderResearchFormSections();
      } catch { alert("Network error"); }
      return;
    }
  });

  root.addEventListener("change", (e) => {
    if (e.target.matches("[data-section-type]")) {
      syncResearchSectionsFromDom();
      const i = Number(e.target.closest("[data-section-row]").dataset.sectionRow);
      const newType = e.target.value;
      // Switching type replaces the section with a fresh default for
      // that type — keeps the state shape always valid for whichever
      // type is now selected, rather than carrying over stale fields
      // from the previous type.
      researchSectionState.sections[i] = researchDefaultSectionFor(newType);
      renderResearchFormSections();
      return;
    }
    if (e.target.matches("[data-section-field='mode']")) {
      syncResearchSectionsFromDom();
      renderResearchFormSections();
      return;
    }
    if (e.target.matches("[data-dataset-select]")) {
      syncResearchSectionsFromDom();
      renderResearchFormSections();
      return;
    }
  });
}

// ---- one-click templates ----

function insertResearchTemplate(templateName) {
  syncResearchSectionsFromDom();
  const templates = {
    country_report: [
      { ...researchDefaultSectionFor("heading"), title: "Regulatory Framework" },
      { ...researchDefaultSectionFor("rich_text"), body: "<p>Describe the licensing framework here.</p>" },
      { ...researchDefaultSectionFor("statistic"), label: "Gambling tax rate", unit: "%" },
      { ...researchDefaultSectionFor("timeline") },
      { ...researchDefaultSectionFor("table") }
    ],
    regulator_profile: [
      { ...researchDefaultSectionFor("heading"), title: "Overview" },
      { ...researchDefaultSectionFor("rich_text") },
      { ...researchDefaultSectionFor("fact_card"), title: "Responsibilities" },
      { ...researchDefaultSectionFor("faq") }
    ],
    sourced_claim: [
      { ...researchDefaultSectionFor("rich_text") },
      { ...researchDefaultSectionFor("source_citation") }
    ],
    report_composition: [
      { ...researchDefaultSectionFor("heading"), title: "Executive Summary" },
      { ...researchDefaultSectionFor("rich_text") },
      { ...researchDefaultSectionFor("research_reference") },
      { ...researchDefaultSectionFor("dataset_table") }
    ]
  };
  const toAdd = templates[templateName];
  if (!toAdd) return;
  researchSectionState.sections.push(...toAdd);
  renderResearchFormSections();
}


function initResearchForm() {
  const form = document.getElementById("researchForm");
  if (!form) return;

  populateResearchDropdowns();
  wireResearchSectionBuilder();
  renderResearchFormSections();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertEl = document.getElementById("researchFormAlert");
    if (alertEl) alertEl.style.display = "none";
    const formData = new FormData(form);

    syncResearchSectionsFromDom();
    const contentJson = { sections: researchSectionState.sections };

    const isEdit = form.dataset.editMode === "true";
    const endpoint = isEdit ? "/en/api/v1/research/update" : "/en/api/v1/research/create";
    const payload = {
      id: formData.get("id") ? parseInt(formData.get("id")) : undefined,
      type: formData.get("type"),
      slug: formData.get("slug"),
      title: formData.get("title"),
      subtitle: formData.get("subtitle") || null,
      excerpt: formData.get("excerpt") || null,
      country_id: formData.get("country_id") || null,
      author_id: formData.get("author_id") || null,
      content_json: contentJson,
      seo_title: formData.get("seo_title") || null,
      seo_description: formData.get("seo_description") || null,
      seo_keywords: formData.get("seo_keywords") || null,
      canonical_url: formData.get("canonical_url") || null,
      status: formData.get("status") || "draft",
      published: formData.get("published") === "1" ? 1 : 0,
      robots: formData.get("robots") || "index,follow",
      featured: formData.get("featured") === "1" ? 1 : 0,
      last_verified_at: formData.get("last_verified_at") || null,
      next_review_at: formData.get("next_review_at") || null,
    };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        if (alertEl) {
          alertEl.className = "alert alert--success";
          alertEl.textContent = isEdit ? "Research item updated!" : "Research item created!";
          alertEl.style.display = "block";
        }
        cancelResearchEdit();
        loadResearchTable();
      } else {
        if (alertEl) { alertEl.className = "alert alert--error"; alertEl.textContent = data.error || "Failed"; alertEl.style.display = "block"; }
      }
    } catch {
      if (alertEl) { alertEl.className = "alert alert--error"; alertEl.textContent = "Network error"; alertEl.style.display = "block"; }
    }
  });
}

