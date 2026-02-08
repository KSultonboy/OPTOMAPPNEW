import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiGet } from "../../lib/api";
import { cardShadow, colors, fonts, radii } from "../../theme";

type Product = {
    id: string;
    name: string;
    barcode: string | null;
    unit: string;
    costPrice: number;
    salePrice: number;
    loyalSalePrice: number;
    imageUrl: string | null;
    stockQty: number;
    minQty: number;
};

const FILTERS = ["ALL", "LOW"] as const;
type FilterMode = (typeof FILTERS)[number];

function formatMoney(n: number) {
    return Number(n || 0).toLocaleString();
}

export default function WarehouseScreen() {
    const [items, setItems] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<FilterMode>("ALL");
    const [refreshing, setRefreshing] = useState(false);

    const fetchProducts = useCallback(async (search?: string) => {
        setLoading(true);
        setError(null);
        const q = (search ?? query).trim();
        const path = q ? `/api/products?q=${encodeURIComponent(q)}` : "/api/products";
        try {
            const res = await apiGet<{ items: Product[] }>(path);
            setItems(res.items || []);
        } catch (e: any) {
            setError(e?.message || "Omborni olishda xatolik");
        } finally {
            setLoading(false);
        }
    }, [query]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    useEffect(() => {
        const t = setTimeout(() => fetchProducts(query), 300);
        return () => clearTimeout(t);
    }, [query, fetchProducts]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchProducts();
        setRefreshing(false);
    }, [fetchProducts]);

    const filtered = useMemo(() => {
        if (filter === "LOW") {
            return items.filter((p) => p.stockQty <= p.minQty);
        }
        return items;
    }, [items, filter]);

    const stats = useMemo(() => {
        const total = items.length;
        const low = items.filter((p) => p.stockQty <= p.minQty).length;
        const value = items.reduce((sum, p) => sum + (p.costPrice || 0) * (p.stockQty || 0), 0);
        return { total, low, value };
    }, [items]);

    const header = (
        <View style={styles.headerCard}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.title}>Ombor</Text>
                    <Text style={styles.subtitle}>Mahsulotlar va qoldiq</Text>
                </View>
                <TouchableOpacity style={styles.refreshButton} onPress={() => fetchProducts()}>
                    <Text style={styles.refreshText}>Yangilash</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Jami</Text>
                    <Text style={styles.statValue}>{stats.total}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Kam qoldi</Text>
                    <Text style={styles.statValue}>{stats.low}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Qiymat</Text>
                    <Text style={styles.statValue}>{formatMoney(stats.value)}</Text>
                </View>
            </View>

            <View style={styles.filterRow}>
                {FILTERS.map((mode) => {
                    const label = mode === "ALL" ? "Hammasi" : "Kam qolgan";
                    const active = filter === mode;
                    return (
                        <TouchableOpacity
                            key={mode}
                            onPress={() => setFilter(mode)}
                            style={[styles.filterPill, active && styles.filterPillActive]}
                        >
                            <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Mahsulot qidirish..."
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.searchInput}
            />

            {error ? (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}
        </View>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <View pointerEvents="none" style={styles.backdrop}>
                <View style={styles.blobTop} />
                <View style={styles.blobBottom} />
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                    const low = item.stockQty <= item.minQty;
                    return (
                        <View style={styles.card}>
                            <View style={styles.cardRow}>
                                <View style={styles.imageWrap}>
                                    {item.imageUrl ? (
                                        <Image source={{ uri: item.imageUrl }} style={styles.image} />
                                    ) : (
                                        <View style={styles.imagePlaceholder}>
                                            <Text style={styles.imagePlaceholderText}>No image</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cardTitle}>{item.name}</Text>
                                    <Text style={styles.cardMeta}>
                                        {item.unit} {item.barcode ? `| ${item.barcode}` : ""}
                                    </Text>
                                </View>
                                <View style={[styles.stockBadge, low ? styles.stockLow : styles.stockOk]}>
                                    <Text style={styles.stockText}>{item.stockQty}</Text>
                                </View>
                            </View>

                            <View style={styles.priceRow}>
                                <View>
                                    <Text style={styles.priceLabel}>Tannarx</Text>
                                    <Text style={styles.priceValue}>{formatMoney(item.costPrice)}</Text>
                                </View>
                                <View>
                                    <Text style={styles.priceLabel}>Oddiy narx</Text>
                                    <Text style={styles.priceValue}>{formatMoney(item.salePrice)}</Text>
                                </View>
                                <View>
                                    <Text style={styles.priceLabel}>Sodiq narx</Text>
                                    <Text style={styles.priceValue}>{formatMoney(item.loyalSalePrice ?? 0)}</Text>
                                </View>
                                <View>
                                    <Text style={styles.priceLabel}>Min qoldiq</Text>
                                    <Text style={styles.priceValue}>{item.minQty}</Text>
                                </View>
                            </View>
                        </View>
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
                            <Text style={styles.emptyText}>Hozircha mahsulot yoq</Text>
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
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: colors.accentSoft,
        top: -140,
        right: -80,
        opacity: 0.45,
    },
    blobBottom: {
        position: "absolute",
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: colors.coralSoft,
        bottom: -150,
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
    statsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 12,
    },
    statCard: {
        width: "31%",
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        borderRadius: radii.soft,
        padding: 10,
        alignItems: "center",
    },
    statLabel: {
        fontFamily: fonts.body,
        fontSize: 11,
        color: colors.muted,
    },
    statValue: {
        fontFamily: fonts.display,
        fontSize: 16,
        color: colors.ink,
        marginTop: 4,
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
        marginTop: 6,
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
    card: {
        backgroundColor: colors.surface,
        borderRadius: radii.card,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 12,
        ...cardShadow,
    },
    cardRow: {
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center",
        columnGap: 10,
    },
    imageWrap: {
        width: 52,
        height: 52,
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bg,
    },
    image: {
        width: "100%",
        height: "100%",
    },
    imagePlaceholder: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.bg,
    },
    imagePlaceholderText: {
        fontFamily: fonts.body,
        fontSize: 9,
        color: colors.muted,
    },
    cardTitle: {
        fontFamily: fonts.heading,
        fontSize: 15,
        color: colors.ink,
    },
    cardMeta: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.muted,
        marginTop: 4,
    },
    stockBadge: {
        minWidth: 42,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radii.pill,
        alignItems: "center",
    },
    stockLow: {
        backgroundColor: colors.roseSoft,
        borderWidth: 1,
        borderColor: "#FCA5A5",
    },
    stockOk: {
        backgroundColor: colors.accentSoft,
        borderWidth: 1,
        borderColor: "#A7F3D0",
    },
    stockText: {
        fontFamily: fonts.heading,
        fontSize: 12,
        color: colors.ink,
    },
    priceRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        flexWrap: "wrap",
        rowGap: 8,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    priceLabel: {
        fontFamily: fonts.body,
        fontSize: 11,
        color: colors.muted,
    },
    priceValue: {
        fontFamily: fonts.heading,
        fontSize: 13,
        color: colors.ink,
        marginTop: 4,
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

