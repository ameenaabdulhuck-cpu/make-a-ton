/**
 * Base API client for the Brightloop billing app.
 * Connects the React frontend to the Django DRF backend.
 */

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api/v1";

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

export function clearAuthToken() {
  authToken = null;
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      errorMessage = body.error || body.detail || JSON.stringify(body);
    } catch (_) {
      // Ignore parse errors, use default message
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  get: (path, headers = {}) => request(path, { method: "GET", headers }),
  post: (path, body, headers = {}) =>
    request(path, {
      method: "POST",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: (path, body, headers = {}) =>
    request(path, {
      method: "PUT",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: (path, headers = {}) => request(path, { method: "DELETE", headers }),
};
