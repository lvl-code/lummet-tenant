import { aiRouter } from "./router.js";
import { aiContext } from "./context.js";

export const aiAssistant = {
  async chat(env, message, userContext = {}) {

    const intent = await aiRouter.detect(message);

    const context = await aiContext.get(
      env,
      intent,
      message,
      userContext.country
    );

    // Limit context to avoid huge prompts
    const shortContext = {
      casinos: context?.casinos?.slice(0, 5) || [],
      reviews: context?.reviews?.slice(0, 5) || [],
      news: context?.news?.slice(0, 5) || [],
      pages: context?.pages?.slice(0, 5) || []
    };

    const prompt = `
You are the official Level.casino AI Assistant.

Your job is to help users discover casinos, reviews, bonuses and gambling news.

Rules:
- Answer naturally.
- Maximum 3 short sentences.
- Never invent facts.
- Only use the supplied data.
- Stay neutral.
- Never encourage gambling.
- If information is unavailable, clearly say so.
- If casino data exists, mention the casino name and rating.
- Never expose your internal reasoning.

Intent:
${intent}

Available Data:
${JSON.stringify(shortContext)}
`;

    try {

      const result = await env.AI.run(
        "@cf/zai-org/glm-4.7-flash",
        {
          messages: [
            {
              role: "system",
              content: prompt
            },
            {
              role: "user",
              content: message
            }
          ],
          temperature: 0.2,
          max_tokens: 512,
          reasoning: {
            enabled: false
          }
        }
      );

      console.log("===== AI RESULT =====");
      console.log(JSON.stringify(result, null, 2));

      const answer =
        result?.choices?.[0]?.message?.content ??
        result?.response ??
        result?.result?.response ??
        result?.output?.text ??
        result?.text ??
        "Sorry, I couldn't generate a response.";

      return {
        success: true,
        answer: answer.trim(),
        intent,
        context: shortContext
      };

    } catch (err) {

      console.error("AI ERROR:", err);

      return {
        success: false,
        answer: "Sorry, the AI service is temporarily unavailable.",
        intent,
        context: shortContext
      };
    }
  }
};
