import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Print from 'expo-print';

import { apiGet } from "../../lib/api";
import { cardShadow, colors, fonts, radii } from "../../theme";

type HistoryType = "SALE" | "RECEIPT" | "EXPENSE";

type HistoryItemRow = {
    productId: string;
    name: string;
    unit: string;
    qty: number;
    price: number;
    lineTotal: number;
};

type HistoryItem = {
    type: HistoryType;
    id: string;
    createdAt: string;
    total: number;
    paymentMethod?: string;
    customer?: string | null;
    items: HistoryItemRow[];
};

const RANGE_OPTIONS = [7, 14, 30] as const;
type RangeDays = (typeof RANGE_OPTIONS)[number];

function formatMoney(n: number) {
    return Number(n || 0).toLocaleString();
}

function parseDateSafe(s: string) {
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : new Date(t);
}

export default function HistoryScreen() {
    const [items, setItems] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const [type, setType] = useState<"ALL" | HistoryType>("ALL");
    const [rangeDays, setRangeDays] = useState<RangeDays>(7);
    const [query, setQuery] = useState("");

    const headerAnim = useRef(new Animated.Value(0)).current;
    const cardAnims = useRef(Array.from({ length: 6 }).map(() => new Animated.Value(0))).current;

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiGet<{ items: HistoryItem[] }>("/api/history?limit=120");
            setItems(res.items || []);
        } catch (e: any) {
            setError(e?.message || "Tarixni olishda xatolik");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    useEffect(() => {
        headerAnim.setValue(0);
        cardAnims.forEach((anim) => anim.setValue(0));

        Animated.parallel([
            Animated.timing(headerAnim, {
                toValue: 1,
                duration: 380,
                useNativeDriver: true,
            }),
            Animated.stagger(
                90,
                cardAnims.map((anim) =>
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    })
                )
            ),
        ]).start();
    }, [headerAnim, cardAnims, items.length]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const now = new Date();
        const from = new Date();
        from.setDate(now.getDate() - (rangeDays - 1));

        return items.filter((item) => {
            if (type !== "ALL" && item.type !== type) return false;

            const date = parseDateSafe(item.createdAt);
            if (date && date < from) return false;

            if (q) {
                const hit = (item.items || []).some((row) =>
                    String(row.name || "").toLowerCase().includes(q)
                );
                if (!hit) return false;
            }
            return true;
        });
    }, [items, query, rangeDays, type]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchHistory();
        setRefreshing(false);
    }, [fetchHistory]);

    async function printReceipt(item: HistoryItem) {
        const created = new Date(item.createdAt).toLocaleString("uz-UZ");
        const rowsHtml = (item.items || []).map(row => `
            <div style="margin-bottom: 2mm;">
                <div style="font-weight: bold;">${row.name}</div>
                <div style="display: flex; justify-content: space-between; font-size: 11px;">
                    <span>${row.qty} ${row.unit} × ${row.price.toLocaleString("uz-UZ")}</span>
                    <span style="font-weight: bold;">${row.lineTotal.toLocaleString("uz-UZ")}</span>
                </div>
            </div>
        `).join('');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                <style>
                    @page { margin: 0; }
                    body { 
                        margin: 0; 
                        padding: 0 4mm;
                        font-family: 'Courier New', Courier, monospace; 
                        font-size: 13px; 
                        line-height: 1.2;
                        color: #000;
                    }
                    .container { width: 100%; max-width: 80mm; margin: 0 auto; }
                    .header { text-align: center; margin-bottom: 4mm; padding-top: 4mm; }
                    .divider { border-bottom: 1px dashed #000; margin: 3mm 0; }
                    .total { display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; margin-top: 5mm; }
                    .footer { text-align: center; font-size: 10px; margin-top: 8mm; padding-bottom: 5mm; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div style="font-size: 20px; font-weight: bold; text-transform: uppercase;">OptomApp</div>
                        <div style="font-size: 12px; margin-top: 2px;">Sotuv Cheki</div>
                    </div>
                    <div style="font-size: 11px;">ID: #${item.id.slice(0, 8)}</div>
                    <div style="font-size: 11px;">Sana: ${created}</div>
                    <div class="divider"></div>
                    ${rowsHtml}
                    <div class="divider"></div>
                    <div class="total">
                        <span>Jami:</span>
                        <span>${item.total.toLocaleString("uz-UZ")}</span>
                    </div>
                    <div class="footer">Xaridingiz uchun rahmat!</div>
                </div>
            </body>
            </html>
        `;
        try {
            await Print.printAsync({ html });
        } catch (e) {
            console.error(e);
        }
    }

    const header = (
        <Animated.View
            style={[
                styles.headerCard,
                {
                    opacity: headerAnim,
                    transform: [
                        {
                            translateY: headerAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [12, 0],
                            }),
                        },
                    ],
                },
            ]}
        >
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.title}>Tarix</Text>
                    <Text style={styles.subtitle}>Oxirgi qabul va sotuvlar</Text>
                </View>
                <TouchableOpacity style={styles.refreshButton} onPress={fetchHistory}>
                    <Text style={styles.refreshText}>Yangilash</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.filterRow}>
                {(["ALL", "SALE", "RECEIPT", "EXPENSE"] as const).map((val) => {
                    const label = val === "ALL" ? "Hammasi" : val === "SALE" ? "Sotuv" : "Qabul";
                    const active = type === val;
                    return (
                        <TouchableOpacity
                            key={val}
                            onPress={() => setType(val)}
                            style={[styles.filterPill, active && styles.filterPillActive]}
                        >
                            <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.filterRow}>
                {RANGE_OPTIONS.map((d) => {
                    const active = rangeDays === d;
                    return (
                        <TouchableOpacity
                            key={d}
                            onPress={() => setRangeDays(d)}
                            style={[styles.filterPill, active && styles.filterPillActive]}
                        >
                            <Text style={[styles.filterText, active && styles.filterTextActive]}>{d} kun</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <TextInput
                placeholder="Mahsulot qidirish..."
                placeholderTextColor={colors.muted}
                value={query}
                onChangeText={setQuery}
                style={styles.searchInput}
            />

            {error ? (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}
        </Animated.View>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <View pointerEvents="none" style={styles.backdrop}>
                <View style={styles.blobTop} />
                <View style={styles.blobBottom} />
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(item) => `${item.type}-${item.id}`}
                renderItem={({ item, index }) => {
                    const tone =
                        item.type === "SALE"
                            ? { bg: "#ECFDF5", border: "#86EFAC", text: "#065F46" }
                            : item.type === "EXPENSE"
                                ? { bg: "#FEF2F2", border: "#FCA5A5", text: "#991B1B" }
                                : { bg: "#FFF7ED", border: "#FDBA74", text: "#9A3412" };
                    const anim = index < cardAnims.length ? cardAnims[index] : null;
                    const animStyle = anim
                        ? {
                            opacity: anim,
                            transform: [
                                {
                                    translateY: anim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [12, 0],
                                    }),
                                },
                            ],
                        }
                        : undefined;

                    return (
                        <Animated.View style={[styles.historyCard, animStyle]}>
                            <View style={styles.cardHeader}>
                                <View>
                                    <View style={[styles.typeBadge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                                        <Text style={[styles.typeBadgeText, { color: tone.text }]}>
                                            {item.type === "SALE" ? "Sotuv" : item.type === "EXPENSE" ? "Xarajat" : "Qabul"}
                                        </Text>
                                    </View>
                                    <Text style={styles.cardId}>#{item.id.slice(0, 8)}</Text>
                                    <Text style={styles.cardMeta}>{new Date(item.createdAt).toLocaleString()}</Text>
                                </View>
                                <View style={styles.cardTotal}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        {item.type === "SALE" && (
                                            <TouchableOpacity
                                                onPress={() => printReceipt(item)}
                                                style={styles.printButton}
                                            >
                                                <Text style={styles.printButtonText}>Print</Text>
                                            </TouchableOpacity>
                                        )}
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.totalValue}>{formatMoney(item.total)}</Text>
                                            {item.paymentMethod ? (
                                                <Text style={styles.cardMeta}>{item.paymentMethod}</Text>
                                            ) : null}
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.itemsBox}>
                                {(item.items || []).slice(0, 3).map((row, idx) => (
                                    <View key={`${item.id}-${idx}`} style={styles.itemRow}>
                                        <Text style={styles.itemName}>{row.name || "Nomalum"}</Text>
                                        <Text style={styles.itemMeta}>
                                            {formatMoney(row.qty)} {row.unit} | {formatMoney(row.lineTotal)}
                                        </Text>
                                    </View>
                                ))}
                                {(item.items || []).length > 3 ? (
                                    <Text style={styles.moreText}>
                                        Yana {(item.items || []).length - 3} ta item
                                    </Text>
                                ) : null}
                            </View>
                        </Animated.View>
                    );
                }}
                ListHeaderComponent={header}
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.emptyWrap}>
                            <ActivityIndicator color={colors.ink} />
                        </View>
                    ) : (
                        <View style={styles.emptyWrap}>
                            <Text style={styles.emptyText}>Hozircha tarix yoq</Text>
                        </View>
                    )
                }
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
            />
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
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: colors.accentSoft,
        top: -120,
        right: -60,
        opacity: 0.5,
    },
    blobBottom: {
        position: "absolute",
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: colors.coralSoft,
        bottom: -140,
        left: -80,
        opacity: 0.45,
    },
    listContent: {
        padding: 20,
        paddingBottom: 120,
    },
    headerCard: {
        backgroundColor: colors.surface,
        borderRadius: radii.card,
        padding: 18,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 16,
        ...cardShadow,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
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
        marginTop: 4,
    },
    refreshButton: {
        backgroundColor: colors.ink,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radii.pill,
    },
    refreshText: {
        fontFamily: fonts.heading,
        fontSize: 12,
        color: colors.surface,
    },
    filterRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: 12,
    },
    filterPill: {
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radii.pill,
        marginRight: 8,
        marginBottom: 8,
    },
    filterPillActive: {
        backgroundColor: colors.ink,
        borderColor: colors.ink,
    },
    filterText: {
        fontFamily: fonts.heading,
        fontSize: 12,
        color: colors.ink,
    },
    filterTextActive: {
        color: colors.surface,
    },
    searchInput: {
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: radii.soft,
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.ink,
        marginTop: 8,
    },
    errorBanner: {
        marginTop: 12,
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
    printButton: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radii.soft,
    },
    printButtonText: {
        fontFamily: fonts.heading,
        fontSize: 11,
        color: colors.ink,
    },
    historyCard: {
        backgroundColor: colors.surface,
        borderRadius: radii.card,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 14,
        ...cardShadow,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    typeBadge: {
        alignSelf: "flex-start",
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radii.pill,
        marginBottom: 6,
    },
    typeBadgeText: {
        fontFamily: fonts.heading,
        fontSize: 11,
    },
    cardId: {
        fontFamily: fonts.heading,
        fontSize: 14,
        color: colors.ink,
    },
    cardMeta: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.muted,
        marginTop: 4,
    },
    cardTotal: {
        alignItems: "flex-end",
    },
    totalValue: {
        fontFamily: fonts.display,
        fontSize: 18,
        color: colors.ink,
    },
    itemsBox: {
        marginTop: 12,
        padding: 12,
        borderRadius: radii.soft,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bg,
    },
    itemRow: {
        marginBottom: 8,
    },
    itemName: {
        fontFamily: fonts.heading,
        fontSize: 13,
        color: colors.ink,
    },
    itemMeta: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.muted,
        marginTop: 2,
    },
    moreText: {
        fontFamily: fonts.body,
        fontSize: 11,
        color: colors.muted,
    },
    emptyWrap: {
        padding: 24,
        alignItems: "center",
    },
    emptyText: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.muted,
    },
});

