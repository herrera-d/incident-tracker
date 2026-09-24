const BASE = "/api";
const TOKEN_KEY = "it_token";
const OWNERS_KEY = "it_owner_tokens";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function readOwners() {
  try {
    return JSON.parse(localStorage.getItem(OWNERS_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeOwners(owners) {
  try {
    localStorage.setItem(OWNERS_KEY, JSON.stringify(owners));
  } catch {
    /* no-op */
  }
}

export function rememberOwner(id, token) {
  const owners = readOwners();
  owners[id] = token;
  writeOwners(owners);
}

export function forgetOwner(id) {
  const owners = readOwners();
  delete owners[id];
  writeOwners(owners);
}

export function ownsIncident(id) {
  return Object.prototype.hasOwnProperty.call(readOwners(), id);
}

function getOwnerTokenFor(id) {
  return readOwners()[id] || null;
}

function ownerIdFromPath(path) {
  const match = String(path).match(/^\/incidents\/([^/]+)/);
  return match ? match[1] : null;
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const ownerId = ownerIdFromPath(path);
  if (ownerId) {
    const owner = getOwnerTokenFor(ownerId);
    if (owner) headers["X-Owner-Token"] = owner;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
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

export const setIncidentStatus = (id, status) =>
  request(`/incidents/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });

export const login = (email, password) =>
  request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const getMe = () => request("/auth/me");

export const register = (user) =>
  request("/auth/register", { method: "POST", body: JSON.stringify(user) });

export const listUsers = () => request("/users");

export const createUser = (user) =>
  request("/users", { method: "POST", body: JSON.stringify(user) });

export const updateUserRole = (id, role) =>
  request(`/users/${id}`, { method: "PUT", body: JSON.stringify({ role }) });

export const deleteUser = (id) =>
  request(`/users/${id}`, { method: "DELETE" });