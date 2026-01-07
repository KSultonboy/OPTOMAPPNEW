import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://178.18.245.174:8080";
console.log("VITE_API_URL =", baseURL);

export const api = axios.create({
  baseURL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("optom_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
