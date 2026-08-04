export const aiRouter = {

async detect(message){

const text = message.toLowerCase();


if(
text.includes("compare") ||
text.includes("vs") ||
text.includes("difference")
)
return "casino_compare";


if(
text.includes("review") ||
text.includes("opinion") ||
text.includes("rating")
)
return "casino_review";


if(
text.includes("bitcoin") ||
text.includes("crypto") ||
text.includes("ethereum") ||
text.includes("payment") ||
text.includes("deposit") ||
text.includes("withdraw")
)
return "payment_methods";


if(
text.includes("license") ||
text.includes("licensed") ||
text.includes("regulator") ||
text.includes("authority")
)
return "licensing";


if(
text.includes("news") ||
text.includes("latest") ||
text.includes("update")
)
return "news";


if(
text.includes("country") ||
text.includes("available") ||
text.includes("allowed") ||
text.includes("legal")
)
return "geo";


if(
text.includes("faq") ||
text.includes("how") ||
text.includes("what is")
)
return "faq";


if(
text.includes("author") ||
text.includes("writer")
)
return "author";


return "search";


}

};
