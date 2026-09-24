// =====================================================
// RESEARCH PDF EXPORT
// Builds a branded, multi-page PDF from the JSON each research
// item page embeds in #research-pdf-data (see renderResearchItem
// in controllers.js) — entirely client-side via jsPDF, loaded
// from cdnjs. No server-side PDF generation: this Worker has no
// build step, so a Node PDF library can't be bundled into it;
// generating in the browser needs zero changes to the Worker.
//
// "Merge related research" works by fetching another research
// item's OWN page (same-origin, public, already rendered) and
// reading its #research-pdf-data block back out via DOMParser —
// no new API endpoint was added for this.
// =====================================================

(function () {
  const PAGE_MARGIN = 15;
  const HEADER_H = 22;
  const FOOTER_H = 14;
  const LOGO_MAX_W = 32;
  const LOGO_MAX_H = 12;

  function getOwnPdfData() {
    const el = document.getElementById("research-pdf-data");
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch { return null; }
  }

  async function fetchRelatedPdfData(url) {
    try {
      const res = await fetch(url, { credentials: "omit" });
      if (!res.ok) return null;
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const el = doc.getElementById("research-pdf-data");
      if (!el) return null;
      return JSON.parse(el.textContent);
    } catch {
      return null;
    }
  }

  // Converts a section's HTML body (from the rich-text editor) into
  // plain paragraphs a PDF can lay out — no HTML-to-PDF renderer is
  // used, so formatting (bold/links) is intentionally not preserved;
  // paragraph and list structure is.
  function htmlToParagraphs(html) {
    if (!html) return [];
    const doc = new DOMParser().parseFromString(String(html), "text/html");
    const paragraphs = [];
    doc.body.querySelectorAll("p, li, h1, h2, h3, h4, blockquote").forEach((el) => {
      const text = el.textContent.replace(/\s+/g, " ").trim();
      if (text) paragraphs.push(el.tagName === "LI" ? "•  " + text : text);
    });
    if (paragraphs.length === 0) {
      const text = doc.body.textContent.replace(/\s+/g, " ").trim();
      if (text) paragraphs.push(text);
    }
    return paragraphs;
  }

  const SUPPORTED_LOGO_TYPES = { "image/png": "PNG", "image/jpeg": "JPEG", "image/jpg": "JPEG", "image/webp": "WEBP" };

  async function loadImageAsDataUrl(url) {
    if (!url) return null;
    try {
      const res = await fetch(url, { credentials: "omit" });
      if (!res.ok) return null;
      const blob = await res.blob();
      // jsPDF's core addImage only supports PNG/JPEG/WEBP — a favicon
      // is frequently .ico or .svg, neither of which it can render;
      // returning null here (rather than a data URL it can't use) is
      // what keeps the logo optional instead of corrupting the header.
      if (!SUPPORTED_LOGO_TYPES[blob.type]) return null;
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return { dataUrl, format: SUPPORTED_LOGO_TYPES[blob.type] };
    } catch {
      return null;
    }
  }

  function makeCursor(doc) {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    return {
      doc, pageW, pageH,
      contentW: pageW - PAGE_MARGIN * 2,
      top: PAGE_MARGIN + HEADER_H,
      bottom: pageH - PAGE_MARGIN - FOOTER_H,
      x: PAGE_MARGIN,
      y: PAGE_MARGIN + HEADER_H
    };
  }

  function ensureSpace(c, needed) {
    if (c.y + needed > c.bottom) {
      c.doc.addPage();
      c.y = c.top;
    }
  }

  function drawHeading(c, text, size) {
    ensureSpace(c, size * 0.6 + 4);
    c.doc.setFont("helvetica", "bold");
    c.doc.setFontSize(size);
    c.doc.setTextColor(20, 20, 20);
    c.doc.text(text, c.x, c.y);
    c.y += size * 0.6 + 3;
  }

  function drawParagraphs(c, paragraphs, opts) {
    opts = opts || {};
    c.doc.setFont("helvetica", opts.italic ? "italic" : "normal");
    c.doc.setFontSize(opts.size || 10.5);
    c.doc.setTextColor(...(opts.color || [40, 40, 40]));
    paragraphs.forEach((p) => {
      const lines = c.doc.splitTextToSize(p, c.contentW);
      const lineH = (opts.size || 10.5) * 0.42;
      lines.forEach((line) => {
        ensureSpace(c, lineH + 1);
        c.doc.text(line, c.x, c.y);
        c.y += lineH;
      });
      c.y += 1.5; // paragraph gap
    });
  }

  function drawRule(c) {
    ensureSpace(c, 4);
    c.doc.setDrawColor(220, 220, 220);
    c.doc.line(c.x, c.y, c.x + c.contentW, c.y);
    c.y += 5;
  }

  function tryAutoTable(c, columns, rows, caption) {
    if (typeof c.doc.autoTable !== "function") {
      // Fallback: no autoTable plugin loaded (e.g. CDN blocked) —
      // render a plain readable list instead of failing the whole PDF.
      if (caption) drawParagraphs(c, [caption], { italic: true, size: 9.5 });
      rows.forEach((row) => {
        const line = columns.map((col, i) => `${col}: ${row[i] ?? "—"}`).join("  |  ");
        drawParagraphs(c, [line], { size: 9 });
      });
      return;
    }
    ensureSpace(c, 20);
    if (caption) drawParagraphs(c, [caption], { italic: true, size: 9.5 });
    c.doc.autoTable({
      startY: c.y,
      margin: { left: c.x, right: PAGE_MARGIN, top: c.top, bottom: c.pageH - c.bottom },
      head: [columns],
      body: rows,
      styles: { fontSize: 9, cellPadding: 2.2 },
      headStyles: { fillColor: [235, 235, 240], textColor: [30, 30, 30], fontStyle: "bold" },
      theme: "grid"
    });
    c.y = c.doc.lastAutoTable.finalY + 6;
  }

  function drawSection(c, section) {
    switch (section.type) {
      case "heading":
        drawHeading(c, section.title || "", 15);
        return;

      case "rich_text":
      case "fact_card":
        if (section.title) drawHeading(c, section.title, 13);
        drawParagraphs(c, htmlToParagraphs(section.body));
        return;

      case "statistic": {
        ensureSpace(c, 22);
        const valueText = `${section.value ?? ""}${section.unit ? " " + section.unit : ""}`;
        c.doc.setFont("helvetica", "bold");
        c.doc.setFontSize(20);
        c.doc.setTextColor(30, 90, 200);
        c.doc.text(valueText, c.x, c.y + 6);
        c.y += 9;
        if (section.label) drawParagraphs(c, [section.label], { size: 10.5, color: [20, 20, 20] });
        if (section.context) drawParagraphs(c, [section.context], { size: 9, italic: true, color: [110, 110, 110] });
        c.y += 2;
        return;
      }

      case "timeline": {
        if (section.title) drawHeading(c, section.title, 13);
        (section.events || []).forEach((ev) => {
          drawParagraphs(c, [`${ev.date || ""} — ${ev.title || ""}`], { size: 10.5 });
          if (ev.description) drawParagraphs(c, [ev.description], { size: 9.5, color: [90, 90, 90] });
        });
        return;
      }

      case "table": {
        if (section.title) drawHeading(c, section.title, 13);
        const cols = Array.isArray(section.columns) ? section.columns : [];
        const rows = Array.isArray(section.rows) ? section.rows : [];
        if (cols.length && rows.length) tryAutoTable(c, cols, rows, section.caption);
        return;
      }

      case "dataset_table": {
        // The page's #research-pdf-data carries the section as
        // authored (dataset_id + version), not the dataset's resolved
        // rows — those are fetched live by the server-side renderer.
        // A PDF export has no server round-trip, so it can't resolve
        // them either; say so plainly rather than silently dropping it.
        if (section.title || section.caption) drawHeading(c, section.title || section.caption, 13);
        drawParagraphs(c, ["[Data table — view the live page for the current data: it updates independently of this PDF.]"], { italic: true, size: 9.5, color: [120, 120, 120] });
        return;
      }

      case "source_citation": {
        drawParagraphs(c, [section.body || ""], { size: 10 });
        if (section.source_label) drawParagraphs(c, [section.source_label], { size: 9, italic: true, color: [110, 110, 110] });
        return;
      }

      case "faq": {
        if (section.title) drawHeading(c, section.title, 13);
        (section.items || []).forEach((item) => {
          drawParagraphs(c, [item.q || ""], { size: 10.5 });
          const answerParas = htmlToParagraphs(item.a);
          drawParagraphs(c, answerParas.length ? answerParas : [String(item.a || "").replace(/<[^>]+>/g, "")], { size: 9.5, color: [80, 80, 80] });
        });
        return;
      }

      case "internal_links": {
        if (section.title) drawHeading(c, section.title, 12);
        (section.links || []).forEach((l) => drawParagraphs(c, [`${l.label || l.url} — ${l.url}`], { size: 9.5, color: [30, 90, 200] }));
        return;
      }

      case "research_reference": {
        if (section.mode === "snapshot" && section.snapshot_title) {
          drawHeading(c, section.snapshot_title, 12);
          if (section.snapshot_excerpt) drawParagraphs(c, [section.snapshot_excerpt], { size: 9.5, italic: true });
        }
        return;
      }

      default:
        return;
    }
  }

  function drawClaims(c, claims) {
    if (!claims || claims.length === 0) return;
    drawRule(c);
    drawHeading(c, "Key facts", 14);
    claims.forEach((claim) => {
      const badge = (claim.status || "").toUpperCase();
      drawParagraphs(c, [`[${badge}]  ${claim.claim_text}`], { size: 10 });
      if (claim.sources && claim.sources.length) {
        drawParagraphs(c, [claim.sources.map((s) => s.organisation).join(", ")], { size: 8.5, italic: true, color: [120, 120, 120] });
      }
    });
  }

  function drawSources(c, sources) {
    if (!sources || sources.length === 0) return;
    drawRule(c);
    drawHeading(c, "Sources", 14);
    sources.forEach((s, i) => {
      const line = `${i + 1}. ${s.organisation}${s.title ? " — " + s.title : ""}${s.url ? " — " + s.url : ""}`;
      drawParagraphs(c, [line], { size: 9 });
    });
  }

  function drawItem(c, item, isFirst) {
    if (!isFirst) c.doc.addPage();
    c.y = c.top;

    const typeLabel = (item.type || "").toUpperCase();
    drawParagraphs(c, [typeLabel], { size: 9, color: [30, 90, 200] });
    drawHeading(c, item.title || "", 18);
    if (item.subtitle) drawParagraphs(c, [item.subtitle], { size: 11, italic: true, color: [90, 90, 90] });
    const meta = [item.country_name, item.last_verified_at ? "Last verified " + String(item.last_verified_at).slice(0, 10) : null].filter(Boolean).join("  ·  ");
    if (meta) drawParagraphs(c, [meta], { size: 8.5, color: [130, 130, 130] });
    if (item.excerpt) { c.y += 1; drawParagraphs(c, [item.excerpt], { size: 10.5, italic: true }); }
    drawRule(c);

    (item.sections || []).forEach((section) => drawSection(c, section));

    drawClaims(c, item.claims);
    drawSources(c, item.sources);
  }

  function drawHeaderFooter(doc, brand) {
    const pageCount = doc.internal.getNumberOfPages();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      doc.setDrawColor(230, 230, 230);
      doc.line(PAGE_MARGIN, PAGE_MARGIN + HEADER_H - 6, pageW - PAGE_MARGIN, PAGE_MARGIN + HEADER_H - 6);
      if (brand.logo) {
        try { doc.addImage(brand.logo.dataUrl, brand.logo.format, PAGE_MARGIN, PAGE_MARGIN - 2, LOGO_MAX_W, LOGO_MAX_H, undefined, "FAST"); } catch { /* skip logo on failure */ }
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      doc.text(brand.siteName || "Level.casino", brand.logo ? PAGE_MARGIN + LOGO_MAX_W + 4 : PAGE_MARGIN, PAGE_MARGIN + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text("Independent research", brand.logo ? PAGE_MARGIN + LOGO_MAX_W + 4 : PAGE_MARGIN, PAGE_MARGIN + 9);

      const footerY = pageH - PAGE_MARGIN - 6;
      doc.setDrawColor(230, 230, 230);
      doc.line(PAGE_MARGIN, footerY - 4, pageW - PAGE_MARGIN, footerY - 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(140, 140, 140);
      doc.text(`Generated ${brand.generatedDate} from ${brand.siteUrl} — content may have changed since. Page ${i} of ${pageCount}`, PAGE_MARGIN, footerY);
    }
  }

  async function generatePdf(items, brand) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const c = makeCursor(doc);

    items.forEach((item, i) => drawItem(c, item, i === 0));

    drawHeaderFooter(doc, brand);

    const filename = (items[0].slug || "research") + (items.length > 1 ? "-and-related" : "") + ".pdf";
    doc.save(filename);
  }

  function setStatus(msg) {
    const el = document.getElementById("researchPdfStatus");
    if (el) el.textContent = msg || "";
  }

  function populateMergeOptions(ownData) {
    const panel = document.getElementById("researchMergePanel");
    const options = document.getElementById("researchMergeOptions");
    if (!panel || !options) return;

    const researchRelated = (ownData.related || []).filter((r) => r.type === "research_item");
    if (researchRelated.length === 0) return;

    options.innerHTML = researchRelated.map((r, i) => `
      <label class="research-merge-panel__option">
        <input type="checkbox" value="${r.url}" data-merge-related="${i}">
        ${r.label}
      </label>
    `).join("");
    panel.style.display = "";
  }

  document.addEventListener("DOMContentLoaded", () => {
    const ownData = getOwnPdfData();
    if (!ownData) return; // not a research item page

    populateMergeOptions(ownData);

    const downloadBtn = document.getElementById("researchDownloadPdfBtn");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", async () => {
        downloadBtn.disabled = true;
        setStatus("Building PDF…");
        try {
          const checked = Array.from(document.querySelectorAll("[data-merge-related]:checked"));
          const items = [ownData];

          for (const box of checked) {
            setStatus("Fetching related research…");
            const related = await fetchRelatedPdfData(box.value);
            if (related) items.push(related);
          }

          const brand = {
            siteName: document.querySelector('meta[property="og:site_name"]')?.content || document.title.split("|").pop().trim() || "Level.casino",
            siteUrl: location.origin,
            generatedDate: new Date().toISOString().slice(0, 10),
            logo: null
          };
          try { brand.logo = await loadImageAsDataUrl(document.body.dataset.siteLogo || null); } catch { /* logo is optional */ }

          await generatePdf(items, brand);
          setStatus("");
        } catch (err) {
          setStatus("Could not build the PDF — please try again.");
          console.error("Research PDF export failed:", err);
        } finally {
          downloadBtn.disabled = false;
        }
      });
    }

    const shareBtn = document.getElementById("researchShareBtn");
    if (shareBtn) {
      shareBtn.addEventListener("click", async () => {
        const shareData = { title: ownData.title, text: ownData.excerpt || ownData.title, url: location.href };
        if (navigator.share) {
          try { await navigator.share(shareData); } catch { /* user cancelled the share sheet — not an error */ }
          return;
        }
        try {
          await navigator.clipboard.writeText(location.href);
          setStatus("Link copied to clipboard");
          setTimeout(() => setStatus(""), 2500);
        } catch {
          setStatus(location.href);
        }
      });
    }
  });
})();
