export const aiRouter = {

async detect(message){

const text =
message.toLowerCase();


if(
text.includes("compare") ||
text.includes("vs")
)
return "compare";


if(
text.includes("review") ||
text.includes("is")
)
return "review";


if(
text.includes("bitcoin") ||
text.includes("crypto") ||
text.includes("payment")
)
return "payment";


if(
text.includes("news") ||
text.includes("latest")
)
return "news";


if(
text.includes("country") ||
text.includes("available") ||
text.includes("legal")
)
return "geo";


if(
text.includes("author") ||
text.includes("writer")
)
return "author";


return "search";


}

};
