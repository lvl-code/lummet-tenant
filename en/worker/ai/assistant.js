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

    const prompt = `
You are Level.casino AI Assistant.

Purpose:
Help users discover casinos, reviews, news and information.

Rules:
- Answer in maximum 3 sentences.
- Never invent information.
- Only use the provided data.
- Always remain neutral.
- Provide links when available.
- Do not encourage gambling.
- If data is unavailable, say so.

Intent:
${intent}

Data:
${JSON.stringify(context)}
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
          max_tokens: 250
        }
      );

      console.log("===== AI RESULT =====");
      console.log(JSON.stringify(result, null, 2));

      const answer =
        result?.response ||
        result?.result?.response ||
        result?.choices?.[0]?.message?.content ||
        result?.output?.text ||
        result?.text ||
        JSON.stringify(result);

      return {
        success: true,
        answer,
        intent,
        context
      };

    } catch (err) {

      console.error("AI ERROR:");
      console.error(err);

      return {
        success: false,
        answer: "AI failed: " + err.message,
        intent,
        context
      };
    }
  }
};
