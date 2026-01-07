import { create } from "zustand";
import { api } from "../lib/api";

type User = { name: string; login: string };

type AuthState = {
  token: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;

  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
};

const TOKEN_KEY = "optom_token";
const USER_KEY = "optom_user";

export const useAuth = create<AuthState>((set) => ({
  token: null,
  user: null,
  loading: false,
  error: null,

  hydrate: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    const user = userRaw ? (JSON.parse(userRaw) as User) : null;
    set({ token, user });
  },

  login: async (login, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post("/api/auth/login", { login, password });

      const token = data?.token as string | undefined;
      const user = (data?.user as User | undefined) ?? { name: "Admin", login };

      if (!token) throw new Error("Login javobi noto‘g‘ri (token yo‘q).");

      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      set({ token, user, loading: false, error: null });
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Login xatosi";
      set({ loading: false, error: msg });
      throw e;
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null, error: null });
  },
}));
