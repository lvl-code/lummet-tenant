export const aiEngine = {
  /**
   * Safe execution wrapper for Cloudflare's native Workers AI system
   */
  async runInference(env, model, inputs) {
    if (!env.AI) {
      console.warn("Workers AI binding is missing. Falling back to static values.");
      return null;
    }
    try {
      return await env.AI.run(model, inputs);
    } catch (error) {
      console.error(`Edge AI Inference Failure: ${error.message}`);
      return null;
    }
  },

  /**
   * Generates highly targeted, high-roller focused review copy on demand
   */
  async generateReviewSummary(env, casinoName, countryCode, languages = 'English') {
    const model = '@cf/zai-org/glm-4.7-flash';
    
    const systemPrompt = `You are an expert iGaming industry copywriter specializing in premium, high-stakes casino analysis. 
Your target audience consists of high-rollers and VIP players. Write a compelling, factual 3-sentence evaluation summary. 
Focus on high-tier VIP reward transparency, cashout speed limits, and licensing authority trust factors. Do not use generic fluff.`;

    const userPrompt = `Write a premium localized casino review intro summary for "${casinoName}" customized specifically for players browsing from jurisdiction code: ${countryCode}. Output the final copy strictly in ${languages}.`;

    const result = await this.runInference(env, model, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.6,
      max_tokens: 150
    });

    return result?.response ? result.response.trim() : `Premium review context for ${casinoName} tracking live under jurisdiction ${countryCode}.`;
  },

  /**
   * Generates hyper-optimized SEO titles and metadata objects for localized landing matrix variants
   */
  async generateDynamicSeo(env, targetDomain, contextData) {
    const model = '@cf/zai-org/glm-4.7-flash';
    
    const systemPrompt = `You are an elite SEO engineer managing the domain portfolio asset ${targetDomain}. 
Generate a strict JSON layout string containing a title tag and meta description optimized for Click-Through Rates (CTR). 
Never include code block wrappers like \`\`\`json in your response. Return raw plain-text valid JSON object only.`;

    const userPrompt = `Context: Type is ${contextData.type}, Slug is ${contextData.slug}, Target Country is ${contextData.country}. 
Create an localized SEO title (under 60 chars) and meta description (under 155 chars) targeting localized VIP casino search intent.`;

    const result = await this.runInference(env, model, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3
    });

    try {
      if (result?.response) {
        return JSON.parse(result.response.trim());
      }
    } catch (e) {
      console.error("AI returned malformed JSON structure:", e);
    }

    // Safe hardcoded structural fallback matrix
    return {
      title: `${contextData.slug.toUpperCase()} Casino Review & VIP Sign-up Bonuses [Geo: ${contextData.country}]`,
      description: `Get real-time player data, active withdrawal framework details, and high-stakes match incentives for ${contextData.slug} inside ${contextData.country}.`
    };
  },
    /**
   * Generates a full-length casino review using Workers AI
   */
  async generateFullReview(env, casinoName, countryCode, slug) {
    const model = '@cf/zai-org/glm-4.7-flash';

    const systemPrompt = `You are an expert iGaming industry copywriter specializing in premium casino reviews.
Write a comprehensive, SEO-optimized casino review of at least 800 words.
Structure your response with clear sections: Overview, Games & Software, Bonuses & Promotions, Payment Methods, Licensing & Security, Pros & Cons, and FAQ.
Do not use markdown headers. Use plain text with section titles on their own line.`;

    const userPrompt = `Write a professional casino review for "${casinoName}" targeted at players from ${countryCode}.
Include specific pros and cons. Include a FAQ section with 3-5 questions.
Make it factual and avoid generic fluff.`;

    const result = await this.runInference(env, model, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.6,
      max_tokens: 1200
    });

    return result?.response
      ? result.response.trim()
      : `${casinoName} is a premium online casino offering a comprehensive gaming experience for players in ${countryCode}. Contact your administrator to configure the AI binding for full review generation.`;
  }


};
