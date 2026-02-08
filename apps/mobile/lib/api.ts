import { getStoredToken } from "./storage";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://178.18.245.174:8081";
const API_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN || "";
const DEFAULT_TIMEOUT_MS = 15000;

type ApiError = Error & { status?: number; data?: unknown };

function joinUrl(baseUrl: string, path: string) {
    if (/^https?:\/\//i.test(path)) return path;
    const base = baseUrl.replace(/\/+$/, "");
    const next = path.replace(/^\/+/, "");
    return `${base}/${next}`;
}

async function resolveToken(tokenOverride?: string | null) {
    if (tokenOverride === null) return null;
    if (typeof tokenOverride === "string") return tokenOverride;
    const stored = await getStoredToken();
    return stored || API_TOKEN;
}

async function fetchJson<T>(path: string, init?: RequestInit, tokenOverride?: string | null): Promise<T> {
    const url = joinUrl(API_BASE_URL, path);
    const headers: Record<string, string> = { Accept: "application/json" };

    const token = await resolveToken(tokenOverride);
    if (token) headers.Authorization = `Bearer ${token}`;

    const hasBody = Boolean(init?.body);
    if (hasBody && !(init?.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
        const res = await fetch(url, {
            ...init,
            headers: { ...headers, ...(init?.headers ?? {}) },
            signal: controller.signal,
        });

        const text = await res.text();
        const data = text ? safeJson(text) : null;

        if (!res.ok) {
            const message =
                (data && typeof (data as any).error === "string" && (data as any).error) ||
                `Request failed (${res.status})`;
            const err = new Error(message) as ApiError;
            err.status = res.status;
            err.data = data;
            throw err;
        }

        return data as T;
    } catch (err: any) {
        if (err?.name === "AbortError") {
            throw new Error("Request timeout");
        }
        throw err;
    } finally {
        clearTimeout(timeout);
    }
}

function safeJson(text: string) {
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

export function apiGet<T>(path: string, tokenOverride?: string | null) {
    return fetchJson<T>(path, { method: "GET" }, tokenOverride);
}

export function apiPost<T>(path: string, body: unknown, tokenOverride?: string | null) {
    return fetchJson<T>(path, { method: "POST", body: JSON.stringify(body) }, tokenOverride);
}

export function apiPut<T>(path: string, body: unknown, tokenOverride?: string | null) {
    return fetchJson<T>(path, { method: "PUT", body: JSON.stringify(body) }, tokenOverride);
}

export function apiPatch<T>(path: string, body: unknown, tokenOverride?: string | null) {
    return fetchJson<T>(path, { method: "PATCH", body: JSON.stringify(body) }, tokenOverride);
}

export function apiDelete<T>(path: string, tokenOverride?: string | null) {
    return fetchJson<T>(path, { method: "DELETE" }, tokenOverride);
}

export function getApiConfig() {
    return { baseUrl: API_BASE_URL, token: API_TOKEN };
}
