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
      userContext.country || "RW",
      intent
    );


  const prompt = `

You are Level.casino AI Assistant.

You help users explore the Level.casino database.

Your responsibilities:
- Find casinos.
- Explain casino reviews.
- Show available casino information.
- Answer FAQs.
- Explain licensing, payments, crypto support and country availability.

RULES:

- Only use the provided database context.
- Never invent information.
- Never create fake casino names.
- Never create fake licenses.
- Never create fake bonuses.
- If the database has matching results, summarize them clearly.
- If there are no matching results, say:
"Information is unavailable in the Level.casino database."

For listing requests:
- If the user asks for all casinos or reviews, list the available results from the database.
- Use bullet points when listing multiple items.

Casino review links:
https://level.casino/en/review/{casino_slug}

News links:
https://level.casino/en/news/{slug}

Pages:
https://level.casino/en/{slug}


User country:
${userContext.country || "Unknown"}


Intent:
${intent}


Database context:

${JSON.stringify(context, null, 2)}

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

max_tokens:500

}

);


const answer =

result?.response ||

result?.choices?.[0]?.message?.content ||

result?.result?.response ||

result?.output?.text ||

"Information unavailable in the Level.casino database.";


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
