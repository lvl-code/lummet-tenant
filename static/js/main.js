// =====================================================
// LOGIN & REGISTER FORMS
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  initLoginForm();
  initRegisterForm();
});

// ---- Login ----
function initLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("loginError");
    errorEl.style.display = "none";

    const formData = new FormData(form);
    const payload = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    try {
      const res = await fetch("/en/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        window.location.href = "/en/dashboard";
      } else {
        errorEl.textContent = data.error || "Login failed";
        errorEl.style.display = "block";
      }
    } catch {
      errorEl.textContent = "Network error. Try again.";
      errorEl.style.display = "block";
    }
  });
}

// ---- Register ----
function initRegisterForm() {
  const form = document.getElementById("registerForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("registerError");
    errorEl.style.display = "none";

    const formData = new FormData(form);
    const payload = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    try {
      const res = await fetch("/en/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        window.location.href = "/en/login";
      } else {
        errorEl.textContent = data.error || "Registration failed";
        errorEl.style.display = "block";
      }
    } catch {
      errorEl.textContent = "Network error. Try again.";
      errorEl.style.display = "block";
    }
  });
}
