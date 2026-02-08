import { useEffect, type ReactNode } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider, useAuth } from "../state/auth";
import { colors } from "../theme";

function AuthGate({ children }: { children: ReactNode }) {
    const { token, hydrating } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (hydrating) return;
        const inAuthGroup = segments[0] === "(auth)";
        if (!token && !inAuthGroup) {
            router.replace("/login");
            return;
        }
        if (token && inAuthGroup) {
            router.replace("/report");
        }
    }, [token, hydrating, segments, router]);

    if (hydrating) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
                <ActivityIndicator color={colors.ink} />
            </View>
        );
    }

    return <>{children}</>;
}

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
                <StatusBar style="dark" />
                <AuthGate>
                    <Stack screenOptions={{ headerShown: false }} />
                </AuthGate>
            </AuthProvider>
        </GestureHandlerRootView>
    );
}
