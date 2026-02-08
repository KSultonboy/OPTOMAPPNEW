import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { colors, fonts } from "../../theme";

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.ink,
                tabBarInactiveTintColor: colors.muted,
                tabBarStyle: {
                    height: 70,
                    paddingTop: 8,
                    paddingBottom: 12,
                    borderTopColor: colors.border,
                    backgroundColor: colors.bg,
                },
                tabBarLabelStyle: {
                    fontFamily: fonts.body,
                    fontSize: 12,
                },
            }}
        >
            <Tabs.Screen
                name="report"
                options={{
                    title: "Hisobot",
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="chart-areaspline" color={color} size={size ?? 22} />
                    ),
                }}
            />
            <Tabs.Screen
                name="customers"
                options={{
                    title: "Mijozlar",
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="account-group-outline" color={color} size={size ?? 22} />
                    ),
                }}
            />
            <Tabs.Screen
                name="warehouse"
                options={{
                    title: "Ombor",
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="warehouse" color={color} size={size ?? 22} />
                    ),
                }}
            />
            <Tabs.Screen
                name="history"
                options={{
                    title: "Tarix",
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="clock-outline" color={color} size={size ?? 22} />
                    ),
                }}
            />
        </Tabs>
    );
}
