async function loadDashboard() {
  const res = await fetch("/api/v1/dashboard");
  const data = await res.json();

  document.getElementById("count-casinos").innerText = data.casinos;
  document.getElementById("count-reviews").innerText = data.reviews;
  document.getElementById("count-clicks").innerText = data.clicks;
  document.getElementById("count-pages").innerText = data.pages;
}

loadDashboard();
