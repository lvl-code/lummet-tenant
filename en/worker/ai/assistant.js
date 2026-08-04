import { aiRouter }
from "./router.js";


import { aiContext }
from "./context.js";



export const aiAssistant = {


async chat(
env,
message,
userContext={}
){


const intent =
await aiRouter.detect(
message
);



const context =
await aiContext.get(
env,
intent,
message,
userContext.country
);



const prompt = `

You are Level.casino AI Assistant.

Purpose:
Help users discover casinos,
reviews, news and information.

Rules:

- Answer maximum 3 sentences.
- Never invent information.
- Only use provided data.
- Always be neutral.
- Provide links when available.
- Do not encourage gambling.
- If data missing say unavailable.

Intent:
${intent}


Data:

${JSON.stringify(context)}

`;



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


max_tokens:250


}

);



return {


answer:

(
result.response ||
result.choices?.[0]
?.message?.content ||
"Unable to answer."
).trim(),


intent,


context

};



}


};
