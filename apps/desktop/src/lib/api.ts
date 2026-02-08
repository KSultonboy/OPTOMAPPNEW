import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8081";
console.log("VITE_API_URL =", baseURL);

export const api = axios.create({ baseURL, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("optom_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const full = `${config.baseURL ?? ""}${config.url ?? ""}`;
  console.log("[REQ]", config.method?.toUpperCase(), full);
  return config;
});

api.interceptors.response.use(
  (res) => {
    console.log("[RES]", res.status, res.config.url);
    return res;
  },
  (err) => {
    const full = `${err?.config?.baseURL ?? ""}${err?.config?.url ?? ""}`;
    console.log("[ERR]", err?.response?.status, full, err?.response?.data);
    return Promise.reject(err);
  }
);
