import { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getApiConfig } from "../../lib/api";
import { useAuth } from "../../state/auth";
import { cardShadow, colors, fonts, radii } from "../../theme";

export default function LoginScreen() {
    const { login, loading, error } = useAuth();
    const [loginValue, setLoginValue] = useState("");
    const [password, setPassword] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);

    const { baseUrl } = getApiConfig();

    const onSubmit = async () => {
        const trimmedLogin = loginValue.trim();
        if (!trimmedLogin || !password) {
            setLocalError("Login va parol kiriting.");
            return;
        }
        setLocalError(null);
        try {
            await login(trimmedLogin, password);
        } catch {
            // error state is handled in auth store
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <View pointerEvents="none" style={styles.backdrop}>
                <View style={styles.blobTop} />
                <View style={styles.blobBottom} />
            </View>

            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <View style={styles.card}>
                    <Text style={styles.title}>Kirish</Text>
                    <Text style={styles.subtitle}>OptomApp hisobotlari uchun login</Text>

                    <View style={styles.field}>
                        <Text style={styles.label}>Login</Text>
                        <TextInput
                            value={loginValue}
                            onChangeText={setLoginValue}
                            placeholder="Login"
                            placeholderTextColor={colors.muted}
                            autoCapitalize="none"
                            autoCorrect={false}
                            style={styles.input}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Parol</Text>
                        <TextInput
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Parol"
                            placeholderTextColor={colors.muted}
                            secureTextEntry
                            style={styles.input}
                        />
                    </View>

                    {(localError || error) && (
                        <View style={styles.errorBanner}>
                            <Text style={styles.errorText}>{localError || error}</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={onSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.surface} />
                        ) : (
                            <Text style={styles.buttonText}>Kirish</Text>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.serverText}>Server: {baseUrl}</Text>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        overflow: "hidden",
    },
    blobTop: {
        position: "absolute",
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: colors.skySoft,
        top: -130,
        left: -80,
        opacity: 0.5,
    },
    blobBottom: {
        position: "absolute",
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: colors.coralSoft,
        bottom: -140,
        right: -80,
        opacity: 0.45,
    },
    container: {
        flex: 1,
        padding: 20,
        justifyContent: "center",
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radii.card,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
        ...cardShadow,
    },
    title: {
        fontFamily: fonts.display,
        fontSize: 26,
        color: colors.ink,
    },
    subtitle: {
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.muted,
        marginTop: 6,
        marginBottom: 18,
    },
    field: {
        marginBottom: 14,
    },
    label: {
        fontFamily: fonts.heading,
        fontSize: 12,
        color: colors.ink,
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: radii.soft,
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.ink,
    },
    button: {
        marginTop: 6,
        backgroundColor: colors.ink,
        borderRadius: radii.pill,
        paddingVertical: 12,
        alignItems: "center",
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        fontFamily: fonts.heading,
        fontSize: 14,
        color: colors.surface,
    },
    errorBanner: {
        marginBottom: 12,
        padding: 12,
        backgroundColor: colors.roseSoft,
        borderRadius: radii.soft,
        borderWidth: 1,
        borderColor: "#FCA5A5",
    },
    errorText: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: "#9F1239",
    },
    serverText: {
        marginTop: 14,
        fontFamily: fonts.mono,
        fontSize: 11,
        color: colors.muted,
    },
});
