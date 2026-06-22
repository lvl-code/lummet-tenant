export const renderEngine = {
  /**
   * High-speed token interpolator for mapping database keys to template syntax
   * Targets formatting like: {{ variable_name }} or {{TITLE}}
   */
  interpolate(templateStr, dataMap) {
    if (!templateStr) return '';
    return templateStr.replace(/\{\{\s*([\w\.]+)\s*\}\}/g, (match, token) => {
      // Handles nested object syntax path selection (e.g., geo.country)
      const value = token.split('.').reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, dataMap);
      return value !== undefined ? value : '';
    });
  },

  /**
   * Compiles dynamic arrays of object entities against isolated UI components
   * Ideal for scaling casino cards, bonus lists, and content snippets
   */
  renderCollection(componentStr, dataArray, globalContext = {}) {
    if (!componentStr || !Array.isArray(dataArray)) return '';
    return dataArray
      .map(item => this.interpolate(componentStr, { ...item, global: globalContext }))
      .join('\n');
  },

  /**
   * Core orchestrator: Stitches layouts, sections, and loop blocks into unified DOM outputs
   */
  async view(layouts, pageTemplate, data) {
    const { base, header, footer, sidebar, components = {} } = layouts;

    // 1. Process structured sub-loop structures before main framework integration
    let processedPage = pageTemplate;
    if (data.casinos && components['casino-card.html']) {
      const casinoCardsHtml = this.renderCollection(components['casino-card.html'], data.casinos, data.geo);
      processedPage = processedPage.replace('{{CASINO_LIST_LOOP}}', casinoCardsHtml);
    }
    
    if (data.bonuses && components['bonus-box.html']) {
      const bonusBoxesHtml = this.renderCollection(components['bonus-box.html'], data.bonuses, data.geo);
      processedPage = processedPage.replace('{{BONUS_LIST_LOOP}}', bonusBoxesHtml);
    }

    // 2. Interpolate variables directly into the inner content layer
    const compiledBody = this.interpolate(processedPage, data);

    // 3. Build layout shell infrastructure fragments
    const renderedHeader = this.interpolate(header, data);
    const renderedFooter = this.interpolate(footer, data);
    const renderedSidebar = sidebar ? this.interpolate(sidebar, data) : '';

    // 4. Inject structural layers into the core system base frame
    const completeHtml = this.interpolate(base, {
      ...data,
      HEADER: renderedHeader,
      FOOTER: renderedFooter,
      SIDEBAR: renderedSidebar,
      CONTENT: compiledBody
    });

    // 5. Ship edge optimized streaming response payload
    return new Response(completeHtml, {
      status: data.httpStatus || 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, no-transform, max-age=120", // 2-min edge execution caching
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff"
      }
    });
  }
};
