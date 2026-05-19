const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
  } catch {
    throw new Error(`Cannot reach backend at ${API_BASE_URL}. Start the server or check VITE_API_BASE_URL.`);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export async function requestEmailOtp(payload) {
  return request("/auth/request-otp", {
    method: "POST",
    body: JSON.stringify(typeof payload === "string" ? { email: payload } : payload),
  });
}

export async function verifyEmailOtp(payload) {
  return request("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function saveWorkspace(payload) {
  return request("/workspace", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loadWorkspace(email) {
  return request(`/workspace/${encodeURIComponent(email)}`);
}
