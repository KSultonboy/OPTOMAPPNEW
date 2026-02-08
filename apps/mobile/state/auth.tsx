import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { apiPost } from "../lib/api";
import {
    clearStoredToken,
    clearStoredUser,
    getStoredToken,
    getStoredUser,
    setStoredToken,
    setStoredUser,
} from "../lib/storage";

type User = { name: string; login: string };

type AuthContextValue = {
    token: string | null;
    user: User | null;
    loading: boolean;
    hydrating: boolean;
    error: string | null;
    login: (login: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    hydrate: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [hydrating, setHydrating] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const hydrate = async () => {
        setHydrating(true);
        const storedToken = await getStoredToken();
        const storedUser = await getStoredUser<User>();
        setToken(storedToken);
        setUser(storedUser);
        setHydrating(false);
    };

    useEffect(() => {
        hydrate();
    }, []);

    const login = async (loginValue: string, password: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiPost<{ token?: string; user?: User }>("/api/auth/login", {
                login: loginValue,
                password,
            }, null);

            const nextToken = data?.token;
            const nextUser = data?.user ?? { name: "Admin", login: loginValue };

            if (!nextToken) {
                throw new Error("Login javobi noto'g'ri (token yo'q).");
            }

            await setStoredToken(nextToken);
            await setStoredUser(nextUser);
            setToken(nextToken);
            setUser(nextUser);
        } catch (e: any) {
            const msg = e?.message || "Login xatosi";
            setError(msg);
            throw e;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        await clearStoredToken();
        await clearStoredUser();
        setToken(null);
        setUser(null);
        setError(null);
    };

    const value = useMemo<AuthContextValue>(() => {
        return { token, user, loading, hydrating, error, login, logout, hydrate };
    }, [token, user, loading, hydrating, error]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used inside AuthProvider");
    }
    return ctx;
}
