async function loadCasinos() {
  const res = await fetch("/api/v1/casinos/list");
  const data = await res.json();

  const tbody = document.querySelector("tbody");

  tbody.innerHTML = data.casinos.map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.slug}</td>
      <td>${c.rating}</td>
      <td>
        <a href="/en/admin/casinos/edit/${c.slug}">Edit</a>
        <button onclick="deleteCasino('${c.slug}')">Delete</button>
      </td>
    </tr>
  `).join("");
}

async function deleteCasino(slug) {
  await fetch("/api/v1/casino/delete", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ slug })
  });

  loadCasinos();
}

loadCasinos();
