async function loadDashboard() {

const res =
await fetch(
"/en/dashboard"
);

const data =
await res.json();

document.getElementById(
"casinoCount"
).textContent =
data.casinos;

document.getElementById(
"reviewCount"
).textContent =
data.reviews;

document.getElementById(
"clickCount"
).textContent =
data.clicks;

document.getElementById(
"pageCount"
).textContent =
data.pages;
}

function showCasinoForm(){

document.getElementById(
"editorArea"
).innerHTML =
`
<h2>Add Casino</h2>

<form id="casinoForm">

<input
placeholder="slug"
id="slug"
>

<input
placeholder="name"
id="name"
>

<button>
Save
</button>

</form>
`;

document
.getElementById(
"casinoForm"
)
.addEventListener(
"submit",
saveCasino
);
}

async function saveCasino(e){

e.preventDefault();

await fetch(
"/api/v1/casino/create",
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
slug:
document.getElementById("slug").value,
name:
document.getElementById("name").value
})
}
);

alert(
"Casino saved"
);

loadDashboard();
}

function showReviewForm(){

document.getElementById(
"editorArea"
).innerHTML =
`
<h2>Add Review</h2>
<p>Review editor here</p>
`;
}

function showPageForm(){

document.getElementById(
"editorArea"
).innerHTML =
`
<h2>Add Page</h2>
<p>Page editor here</p>
`;
}

loadDashboard();
