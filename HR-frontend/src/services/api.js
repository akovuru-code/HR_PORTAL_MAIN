const API_URL = "/api";

const getConfig = (method = "GET", body = null) => {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  return {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) }),
  };
};

export const login = async (email, password, role) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role }),
  });
  return res.json();
};

export const register = async (name, email, password, role, fillingCompany) => {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, role, fillingCompany }),
  });
  return res.json();
};

export const getEmployee = async (id) => {
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${API_URL}/employee/${id}`, { headers });
  return res.json();
};

export const createEmployee = async (data) => {
  const res = await fetch(`${API_URL}/employee`, getConfig("POST", data));
  return res.json();
};

export const updateEmployee = async (id, data) => {
  const res = await fetch(`${API_URL}/employee/${id}`, getConfig("PUT", data));
  return res.json();
};

export const deleteEmployee = async (id) => {
  const res = await fetch(`${API_URL}/employee/${id}`, getConfig("DELETE"));
  return res.json();
};



