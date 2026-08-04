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

STRICT RULES:

- Only use information from the database context.
- Never invent casinos.
- Never invent licenses.
- Never invent bonuses.
- Never invent payment methods.
- Keep answers short and useful.
- If matching information exists, always use it.
- Never say information is unavailable when matching database results exist.

For listing requests:
- List available casinos or reviews from the database.
- Use numbered lists.

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



let answer =

result?.response ||

result?.choices?.[0]?.message?.content ||

result?.result?.response ||

result?.output?.text;



const lowerMessage =
message.toLowerCase();



// =================================
// CASINO LIST FALLBACK
// =================================

if(

(!answer ||
answer.includes("Information unavailable"))

&&

context.casinos?.length

&&

intent === "search"

&&

(
lowerMessage.includes("list") ||
lowerMessage.includes("show") ||
lowerMessage.includes("all casinos") ||
lowerMessage.includes("available casinos")
)

){


answer =

"Available casinos in the Level.casino database:\n\n" +

context.casinos

.map(

(casino,index)=>

`${index + 1}. ${casino.name} - Rating: ${casino.rating || "N/A"}`

)

.join("\n");


}



// =================================
// REVIEW LIST FALLBACK
// =================================

if(

(!answer ||
answer.includes("Information unavailable"))

&&

context.reviews?.length

&&

intent === "casino_review"

){


answer =

"Available casino reviews in the Level.casino database:\n\n" +

context.reviews

.map(

(review,index)=>

`${index + 1}. ${review.title}`

)

.join("\n");


}



// =================================
// FAQ FALLBACK
// =================================

if(

(!answer ||
answer.includes("Information unavailable"))

&&

context.faqs?.length

){


answer =

"Frequently asked questions:\n\n" +

context.faqs

.map(

(faq,index)=>

`${index + 1}. ${faq.q}\n${faq.a}`

)

.join("\n\n");


}



// FINAL FALLBACK

if(!answer){

answer =
"Information unavailable in the Level.casino database.";

}



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
