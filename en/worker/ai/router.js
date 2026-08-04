export const aiRouter = {

async detect(message){

const text = message.toLowerCase().trim();


// ======================
// COMPARE
// ======================

if(
text.includes("compare") ||
text.includes(" vs ") ||
text.includes("difference") ||
text.includes("better than")
)
return "casino_compare";


// ======================
// LIST / SEARCH
// ======================

if(
text.includes("list") ||
text.includes("show") ||
text.includes("all casinos") ||
text.includes("casinos available") ||
text.includes("available casinos") ||
text.includes("find casino") ||
text.includes("casino")
)
return "search";


// ======================
// REVIEWS
// ======================

if(
text.includes("review") ||
text.includes("opinion") ||
text.includes("rating") ||
text.includes("score")
)
return "casino_review";


// ======================
// PAYMENTS
// ======================

if(
text.includes("bitcoin") ||
text.includes("crypto") ||
text.includes("ethereum") ||
text.includes("payment") ||
text.includes("deposit") ||
text.includes("withdraw") ||
text.includes("withdrawal")
)
return "payment_methods";


// ======================
// LICENSING
// ======================

if(
text.includes("license") ||
text.includes("licensed") ||
text.includes("licence") ||
text.includes("regulator") ||
text.includes("authority")
)
return "licensing";


// ======================
// NEWS
// ======================

if(
text.includes("news") ||
text.includes("latest") ||
text.includes("update") ||
text.includes("new")
)
return "news";


// ======================
// GEO AVAILABILITY
// ======================

if(
text.includes("country") ||
text.includes("countries") ||
text.includes("allowed") ||
text.includes("legal") ||
text.includes("where can") ||
text.includes("my country")
)
return "geo";


// ======================
// FAQ
// ======================

if(
text.includes("faq") ||
text.startsWith("how") ||
text.startsWith("what is") ||
text.startsWith("why")
)
return "faq";


// ======================
// AUTHOR
// ======================

if(
text.includes("author") ||
text.includes("writer")
)
return "author";


// DEFAULT
// ======================

return "search";


}

};
