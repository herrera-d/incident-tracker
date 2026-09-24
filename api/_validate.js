const SEVERITIES = ["baja", "media", "alta", "critica"];

export function validateIncident(body, { partial = false } = {}) {
  const errors = [];
  const data = {};
  const req = partial
    ? (v, field) => v !== undefined || errors.push(`Falta el campo "${field}"`)
    : (v, field) => !v && errors.push(`Falta el campo "${field}"`);

  if (!partial || body.date !== undefined) {
    req(body.date, "date");
    if (body.date && !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) errors.push("El campo \"date\" debe tener formato YYYY-MM-DD");
    else data.date = body.date;
  }

  if (!partial || body.day !== undefined) {
    req(body.day, "day");
    data.day = body.day;
  }

  if (!partial || body.time !== undefined) {
    req(body.time, "time");
    if (body.time && !/^\d{2}:\d{2}$/.test(body.time)) errors.push("El campo \"time\" debe tener formato HH:MM");
    else data.time = body.time;
  }

  if (!partial || body.severity !== undefined) {
    req(body.severity, "severity");
    if (body.severity && !SEVERITIES.includes(body.severity)) {
      errors.push(`El campo "severity" debe ser uno de: ${SEVERITIES.join(", ")}`);
    } else data.severity = body.severity;
  }

  if (!partial || body.ambulance !== undefined) {
    if (body.ambulance !== undefined && typeof body.ambulance !== "boolean") {
      errors.push("El campo \"ambulance\" debe ser booleano");
    } else data.ambulance = body.ambulance ? 1 : 0;
  }

  if (body.comments !== undefined) {
    data.comments = String(body.comments ?? "");
  }

  return { errors, data };
}