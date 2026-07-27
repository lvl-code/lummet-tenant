/**
 * LEVEL.CASINO
 * OLD URL → NEW URL PERMANENT REDIRECT WORKER
 *
 * Migration:
 * Old:
 * https://level.casino/reviews/stake/
 *
 * New:
 * https://level.casino/en/review/stake-casino-review
 *
 * Status:
 * 301 Permanent Migration
 */


const DOMAIN = "https://level.casino";


// ===============================
// OLD COUNTRY NAMES → NEW ISO
// ===============================

const COUNTRY_MAP = {

"canada":"CA",
"malaysia":"MY",
"nigeria":"NG",
"finland":"FI",
"denmark":"DK",
"switzerland":"CH",
"austria":"AT",
"netherlands":"NL",
"belgium":"BE",
"germany":"DE",
"australia":"AU",
"sweden":"SE",
"norway":"NO",
"new-zealand":"NZ",
"ireland":"IE",
"poland":"PL",
"brazil":"BR",
"mexico":"MX",
"south-africa":"ZA",
"japan":"JP",
"india":"IN",
"spain":"ES",
"italy":"IT",
"france":"FR",
"turkey":"TR",
"philippines":"PH",
"vietnam":"VN",
"thailand":"TH",
"chile":"CL",
"peru":"PE",
"czech-republic":"CZ",
"greece":"GR",
"hungary":"HU",
"romania":"RO",
"united-kingdom":"GB",
"usa":"US"

};


// ===============================
// OLD CATEGORY → NEW CATEGORY
// ===============================

const CATEGORY_MAP = {

"top":"new",
"featured":"new",
"best":"new",
"trusted":"new",

"fast-payout":"instant-withdrawal",

"crypto":"crypto",
"europe":"europe",
"asia":"asia",
"africa":"africa"

};


// ===============================
// STATIC OLD PAGES
// ===============================


const STATIC = {


"/":
"/en/",


"/about-us.html":
"/en/about-us",


"/about-us":
"/en/about-us",


"/responsible-gambling.html":
"/en/responsible-gambling",


"/responsible-gambling":
"/en/responsible-gambling",


"/cookie-policy.html":
"/en/cookies",


"/cookie-policy":
"/en/cookies",


"/terms-and-conditions.html":
"/en/terms",


"/terms-and-conditions":
"/en/terms",


"/privacy-policy.html":
"/en/privacy",


"/privacy-policy":
"/en/privacy",


"/contact":
"/en/contact",


"/login":
"/en/",


"/register":
"/en/",


"/dashboard":
"/en/",


"/beta":
"/en/beta/new-version",


"/beta/":
"/en/beta/new-version"


};



// ===============================
// MAIN REDIRECT ENGINE
// ===============================


function getRedirect(path, query){


let clean =
path
.replace(/\/+/g,"/")
.replace(/\.html$/,"")
.replace(/\/$/,"");



// Already new version
if(clean.startsWith("/en"))
return null;



// Static pages

if(STATIC[clean])
return STATIC[clean];




// ===============================
// OLD review.html?id=x
// ===============================

if(
path==="/review.html" &&
query.has("id")
){

let id=query.get("id");

return `/en/review/${id}-casino-review`;

}




// ===============================
// OLD /review?id=x
// ===============================

if(
clean==="/review" &&
query.has("id")
){

let id=query.get("id");

return `/en/review/${id}-casino-review`;

}



// ===============================
// OLD REVIEWS
//
// /reviews/stake/
// → /en/review/stake-casino-review
//
// ===============================


if(clean.startsWith("/reviews/")){


let slug =
clean.split("/")[2];


if(slug){

return `/en/review/${slug}-casino-review`;

}

}



if(clean==="/reviews")
return "/en/review";



// ===============================
// OLD CASINOS
//
// /casinos/
// /casinos/top/
// /casinos/germany/
// ===============================


if(clean==="/casinos")
return "/en/casino";



if(clean.startsWith("/casinos/")){


let parts =
clean.split("/").filter(Boolean);


let item=parts[1];



if(!item)
return "/en/casino";



// Country

if(COUNTRY_MAP[item]){

return `/en/country/${COUNTRY_MAP[item]}`;

}



// Category

if(CATEGORY_MAP[item]){

return `/en/category/${CATEGORY_MAP[item]}`;

}



// fallback

return `/en/category/${item}`;


}




// ===============================
// OLD NEWS
// ===============================


if(clean==="/news")
return "/en/news";



if(clean.startsWith("/news/")){


let slug =
clean.split("/")[2];


return `/en/news/${slug}`;

}




// ===============================
// OLD CRYPTO
// ===============================


if(clean.startsWith("/crypto")){


return "/en/category/crypto";

}



// ===============================
// OLD GUIDES
// ===============================


if(clean.startsWith("/guides")){


return "/en/";

}



// ===============================
// OLD GO LINKS
// ===============================


if(
clean.startsWith("/go/")
){

let slug =
clean.split("/")[2];


if(slug)
return `/en/casino/${slug}`;


}



// no match

return null;


}




// ===============================
// WORKER
// ===============================


export default {


async fetch(request){


const url =
new URL(request.url);



let target =
getRedirect(
url.pathname,
url.searchParams
);



if(target){


return Response.redirect(
DOMAIN + target,
301
);


}



// keep verification

if(
url.pathname.includes("naver8a50effa6672bbc53519b40c0cf38009.html")
){

return null;

}



// fallback old homepage

if(
url.pathname==="/"
){

return Response.redirect(
DOMAIN+"/en/",
301
);

}



// everything else

//return fetch(request);
// no redirect
return null;

}


};
