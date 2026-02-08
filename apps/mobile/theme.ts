import { Platform } from "react-native";

export const colors = {
    bg: "#F6F1E9",
    surface: "#FFFFFF",
    ink: "#1F1A17",
    muted: "#6B6358",
    border: "#E7DFD5",
    accent: "#0F766E",
    accentSoft: "#D1FAE5",
    amber: "#F59E0B",
    amberSoft: "#FEF3C7",
    skySoft: "#E0F2FE",
    coralSoft: "#FFE4D6",
    roseSoft: "#FFE4E6",
};

export const fonts = {
    display: Platform.select({
        ios: "AvenirNext-Heavy",
        android: "sans-serif-condensed",
        default: "sans-serif",
    }),
    heading: Platform.select({
        ios: "AvenirNext-DemiBold",
        android: "sans-serif-medium",
        default: "sans-serif",
    }),
    body: Platform.select({
        ios: "AvenirNext-Regular",
        android: "sans-serif",
        default: "sans-serif",
    }),
    mono: Platform.select({
        ios: "Menlo",
        android: "monospace",
        default: "monospace",
    }),
};

export const radii = {
    card: 20,
    pill: 999,
    soft: 14,
};

export const cardShadow = {
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
};
