import AsyncStorage from "@react-native-async-storage/async-storage";

export const TOKEN_KEY = "optom_token";
export const USER_KEY = "optom_user";

export async function getStoredToken() {
    return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setStoredToken(token: string) {
    return AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearStoredToken() {
    return AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getStoredUser<T = unknown>() {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export async function setStoredUser(user: unknown) {
    return AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearStoredUser() {
    return AsyncStorage.removeItem(USER_KEY);
}
