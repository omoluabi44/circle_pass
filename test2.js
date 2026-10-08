function getLocalDatetimeString(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  const pad = (n) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

console.log(getLocalDatetimeString("2026-10-15T18:00:00Z"));
