import { aiRouter } from "./router.js";
import { aiSearch } from "./search.js";


export const aiAssistant = {


async chat(
  env,
  message,
  userContext = {}
){


  const intent =
    await aiRouter.detect(message);



  const context =
    await aiSearch.search(
      env,
      message,
      userContext.country || "RW"
    );



  const prompt = `

You are Level.casino AI Assistant.

You are an independent online casino comparison assistant.

Your role:
- Help users discover casino reviews.
- Explain casino information.
- Summarize casino news.
- Compare casino operators.
- Answer questions about payments, crypto support, licensing, countries and FAQs.

STRICT ACCURACY RULES:

- Only use information from the provided database context.
- Never invent casinos.
- Never invent licenses.
- Never invent bonuses.
- Never invent payment methods.
- Never claim a casino is safe unless the database confirms facts.
- If information is missing, say "Information is unavailable in the Level.casino database."
- Remain neutral and editorial.
- Do not encourage gambling.
- Do not give gambling advice.
- Maximum 5 sentences.

LINK RULES:

When mentioning a casino review:
Use:
https://level.casino/en/review/{casino_slug}

When mentioning news:
Use:
https://level.casino/en/news/{slug}

When mentioning pages:
Use:
https://level.casino/en/{slug}


User country:
${userContext.country || "Unknown"}


Intent:
${intent}


Database context:

${JSON.stringify(context)}

`;



try {


    const result =
      await env.AI.run(

        "@cf/zai-org/glm-4.7-flash",

        {

          messages:[

            {
              role:"system",
              content:prompt
            },

            {
              role:"user",
              content:message
            }

          ],


          temperature:0.2,

          max_tokens:350

        }

      );



    console.log("===== AI RESULT =====");
    console.log(JSON.stringify(result,null,2));



    const answer =

      result?.response ||

      result?.choices?.[0]?.message?.content ||

      result?.result?.response ||

      result?.output?.text ||

      "Information unavailable.";



    return {

      success:true,

      answer:answer.trim(),

      intent,

      context

    };



}

catch(error){


    console.error(
      "AI ERROR:",
      error
    );


    return {

      success:false,

      answer:"AI service unavailable.",

      intent,

      context

    };


}



}


};
