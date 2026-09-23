const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Error ${res.status}`);
  }
  return data;
}

export const fetchIncidents = () => request("/incidents");

export const createIncident = (incident) =>
  request("/incidents", { method: "POST", body: JSON.stringify(incident) });

export const updateIncident = (id, incident) =>
  request(`/incidents/${id}`, { method: "PUT", body: JSON.stringify(incident) });

export const deleteIncident = (id) =>
  request(`/incidents/${id}`, { method: "DELETE" });