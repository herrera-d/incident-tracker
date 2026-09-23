let hideTimer = null;
let activeEl = null;

export default function toast(message, type = "success") {
  const root = document.getElementById("toast-root");
  if (!root) return;

  if (hideTimer) clearTimeout(hideTimer);
  if (activeEl) activeEl.remove();

  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.setAttribute("role", "status");
  el.textContent = message;
  activeEl = el;
  root.appendChild(el);

  requestAnimationFrame(() => el.classList.add("is-visible"));

  hideTimer = setTimeout(() => {
    el.classList.remove("is-visible");
    setTimeout(() => {
      if (root.contains(el)) el.remove();
      if (activeEl === el) activeEl = null;
    }, 300);
  }, 3200);
}