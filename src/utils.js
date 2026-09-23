export function dayName(date) {
  const names = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return names[date.getDay()];
}

export function formatShortDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
}

export function monthLabel(key) {
  const [y, m] = key.split("-");
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${months[Number(m) - 1]} ${y}`;
}

export function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}