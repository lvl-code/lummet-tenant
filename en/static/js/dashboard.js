async function loadDashboard() {
    try {
        const res = await fetch('/api/v1/dashboard', {
            credentials: 'include'
        });

        const data = await res.json();

        if (!data) return;

        document.getElementById('casinos').innerText = data.casinos || 0;
        document.getElementById('reviews').innerText = data.reviews || 0;
        document.getElementById('clicks').innerText = data.clicks || 0;
        document.getElementById('pages').innerText = data.pages || 0;

    } catch (err) {
        console.error("Dashboard load failed", err);
    }
}

window.addEventListener('DOMContentLoaded', loadDashboard);
