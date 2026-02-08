
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiGet } from "../../lib/api";
import { cardShadow, colors, fonts, radii } from "../../theme";

type LowStockItem = { id: string; name: string; stockQty: number; minQty: number };

type SummaryResponse = {
    today: {
        receiptCount: number;
        receiptTotal: number;
        saleCount: number;
        saleTotal: number;
        expenseCount?: number;
        expenseTotal?: number;
    };
    stock: {
        stockValue: number;
        lowStock: LowStockItem[];
    };
};

type DayPoint = {
    date: string;
    receiptsTotal: number;
    salesTotal: number;
};

type RangeSummaryResponse = {
    from: string;
    to: string;
    totals: {
        receiptsTotal: number;
        receiptsCount: number;
        salesTotal: number;
        salesCount: number;
        expensesTotal?: number;
        expensesCount?: number;
    };
    customerSummary: {
        regularSalesTotal: number;
        regularSalesCount: number;
        loyalSalesTotal: number;
        loyalSalesCount: number;
        loyalCustomersCount: number;
    };
    customerRanking: {
        customerId: string | null;
        name: string;
        phone: string | null;
        totalSales: number;
        saleCount: number;
        lastSaleAt: string | null;
    }[];
    days: DayPoint[];
};

const EMPTY_CUSTOMER_SUMMARY: RangeSummaryResponse["customerSummary"] = {
    regularSalesTotal: 0,
    regularSalesCount: 0,
    loyalSalesTotal: 0,
    loyalSalesCount: 0,
    loyalCustomersCount: 0,
};

type TopProduct = {
    productId: string;
    name: string;
    unit: string;
    qty: number;
    revenue: number;
};

type TopProductsResponse = {
    from: string;
    to: string;
    items: TopProduct[];
};

const RANGE_PRESETS = [7, 14, 30, 60] as const;
const SPARK_MODES = ["NON_ZERO", "ALL", "ONLY_SALES", "ONLY_RECEIPTS"] as const;
type SparkDays = (typeof RANGE_PRESETS)[number];
type SparkMode = (typeof SPARK_MODES)[number];

function fmt(n: number) {
    return Number(n || 0).toFixed(2);
}

function isoDate(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function clampDateStr(s: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
    return s;
}

export default function ReportScreen() {
    const todayStr = useMemo(() => isoDate(new Date()), []);
    const defaultFrom = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        return isoDate(d);
    }, []);

    const [from, setFrom] = useState(defaultFrom);
    const [to, setTo] = useState(todayStr);
    const [summary, setSummary] = useState<SummaryResponse | null>(null);
    const [range, setRange] = useState<RangeSummaryResponse | null>(null);
    const [top, setTop] = useState<TopProductsResponse | null>(null);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [loadingRange, setLoadingRange] = useState(false);
    const [loadingTop, setLoadingTop] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const [sparkDays, setSparkDays] = useState<SparkDays>(7);
    const [sparkMode, setSparkMode] = useState<SparkMode>("NON_ZERO");

    const heroAnim = useRef(new Animated.Value(0)).current;
    const statAnims = useRef(Array.from({ length: 5 }).map(() => new Animated.Value(0))).current;

    const fetchSummary = useCallback(async () => {
        setLoadingSummary(true);
        setError(null);
        try {
            const res = await apiGet<SummaryResponse>("/api/reports/summary");
            setSummary(res);
        } catch (e: any) {
            setError(e?.message || "Hisobotlarni olishda xatolik");
        } finally {
            setLoadingSummary(false);
        }
    }, []);

    const fetchRangeAndTop = useCallback(async (nextFrom?: string, nextTo?: string) => {
        const f = clampDateStr(nextFrom ?? from);
        const t = clampDateStr(nextTo ?? to);

        if (!f || !t) {
            setError("Sana formati notogri (YYYY-MM-DD).");
            return;
        }
        if (f > t) {
            setError("From sanasi To sanasidan katta bolishi mumkin emas.");
            return;
        }

        setError(null);
        setLoadingRange(true);
        try {
            const res = await apiGet<RangeSummaryResponse>(
                `/api/reports/summary-range?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`
            );
            setRange(res);
        } catch (e: any) {
            setError(e?.message || "Range hisobotni olishda xatolik");
            setRange(null);
        } finally {
            setLoadingRange(false);
        }

        setLoadingTop(true);
        try {
            const res = await apiGet<TopProductsResponse>(
                `/api/reports/top-products?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}&limit=8`
            );
            setTop(res);
        } catch (e: any) {
            setError(e?.message || "Top mahsulotlarni olishda xatolik");
            setTop(null);
        } finally {
            setLoadingTop(false);
        }
    }, [from, to]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    useEffect(() => {
        fetchRangeAndTop(from, to);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        heroAnim.setValue(0);
        statAnims.forEach((anim) => anim.setValue(0));

        Animated.parallel([
            Animated.timing(heroAnim, {
                toValue: 1,
                duration: 420,
                useNativeDriver: true,
            }),
            Animated.stagger(
                120,
                statAnims.map((anim) =>
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 380,
                        useNativeDriver: true,
                    })
                )
            ),
        ]).start();
    }, [heroAnim, statAnims, from, to]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.allSettled([fetchSummary(), fetchRangeAndTop(from, to)]);
        setRefreshing(false);
    }, [fetchSummary, fetchRangeAndTop, from, to]);

    const sparkDaysList = useMemo(() => {
        const days = range?.days ?? [];
        if (!days.length) return [];

        const sliced = days.slice(-sparkDays);

        if (sparkMode === "ALL") return sliced;
        if (sparkMode === "ONLY_SALES") return sliced.filter((d) => (d.salesTotal ?? 0) > 0);
        if (sparkMode === "ONLY_RECEIPTS") return sliced.filter((d) => (d.receiptsTotal ?? 0) > 0);

        return sliced.filter((d) => (d.salesTotal ?? 0) > 0 || (d.receiptsTotal ?? 0) > 0);
    }, [range?.days, sparkDays, sparkMode]);

    const sparkMax = useMemo(() => {
        if (!sparkDaysList.length) return 1;
        return Math.max(...sparkDaysList.map((d) => Math.max(d.salesTotal ?? 0, d.receiptsTotal ?? 0, 1)));
    }, [sparkDaysList]);

    const rangeTotals = range?.totals;
    const customerSummary = range?.customerSummary ?? EMPTY_CUSTOMER_SUMMARY;
    const customerRanking = Array.isArray(range?.customerRanking) ? range!.customerRanking : [];

    const applyPreset = useCallback(
        (days: SparkDays) => {
            const toDate = new Date();
            const fromDate = new Date();
            fromDate.setDate(toDate.getDate() - (days - 1));
            const nextFrom = isoDate(fromDate);
            const nextTo = isoDate(toDate);
            setFrom(nextFrom);
            setTo(nextTo);
            fetchRangeAndTop(nextFrom, nextTo);
        },
        [fetchRangeAndTop]
    );

    return (
        <SafeAreaView style={styles.safe}>
            <View pointerEvents="none" style={styles.backdrop}>
                <View style={styles.blobTop} />
                <View style={styles.blobBottom} />
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
            >
                <Animated.View
                    style={[
                        styles.heroCard,
                        {
                            opacity: heroAnim,
                            transform: [
                                {
                                    translateY: heroAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [12, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <View style={styles.heroRow}>
                        <View>
                            <Text style={styles.title}>Hisobotlar</Text>
                            <Text style={styles.subtitle}>Bugungi holat va sana boyicha analiz</Text>
                        </View>
                        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                            <Text style={styles.refreshText}>Yangilash</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.filterRow}>
                        <View style={styles.dateField}>
                            <Text style={styles.inputLabel}>From</Text>
                            <TextInput
                                value={from}
                                onChangeText={setFrom}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={colors.muted}
                                autoCapitalize="none"
                                style={styles.input}
                            />
                        </View>
                        <View style={styles.dateField}>
                            <Text style={styles.inputLabel}>To</Text>
                            <TextInput
                                value={to}
                                onChangeText={setTo}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={colors.muted}
                                autoCapitalize="none"
                                style={styles.input}
                            />
                        </View>
                    </View>

                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => fetchRangeAndTop(from, to)}
                            disabled={loadingRange || loadingTop}
                        >
                            <Text style={styles.primaryText}>
                                {loadingRange || loadingTop ? "Yuklanmoqda..." : "Filterni qollash"}
                            </Text>
                        </TouchableOpacity>
                        <View style={styles.presetRow}>
                            {RANGE_PRESETS.map((d) => (
                                <TouchableOpacity key={d} onPress={() => applyPreset(d)} style={styles.presetPill}>
                                    <Text style={styles.presetText}>{d} kun</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {error ? (
                        <View style={styles.errorBanner}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}
                </Animated.View>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Bugungi raqamlar</Text>
                    <View style={styles.statsRow}>
                        <StatCard
                            label="Bugungi kirim"
                            value={summary?.today.receiptTotal ?? 0}
                            hint={summary ? `${summary.today.receiptCount} ta qabul` : ""}
                            tone="receipt"
                            loading={loadingSummary}
                            anim={statAnims[0]}
                        />
                        <StatCard
                            label="Bugungi sotuv"
                            value={summary?.today.saleTotal ?? 0}
                            hint={summary ? `${summary.today.saleCount} ta sotuv` : ""}
                            tone="sale"
                            loading={loadingSummary}
                            anim={statAnims[1]}
                        />
                        <StatCard
                            label="Bugungi xarajat"
                            value={summary?.today.expenseTotal ?? 0}
                            hint={summary ? `${summary.today.expenseCount ?? 0} ta` : ""}
                            tone="expense"
                            loading={loadingSummary}
                            anim={statAnims[2]}
                        />
                        <StatCard
                            label="Ombor qiymati"
                            value={summary?.stock.stockValue ?? 0}
                            hint="Tannarx boyicha"
                            tone="stock"
                            loading={loadingSummary}
                            anim={statAnims[3]}
                        />
                        <StatCard
                            label="Kam qolganlar"
                            value={summary?.stock.lowStock.length ?? 0}
                            hint="Min qoldiqdan past"
                            tone="low"
                            loading={loadingSummary}
                            anim={statAnims[4]}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Sana boyicha umumiy</Text>
                    <View style={styles.rangeCard}>
                        <View style={styles.rangeHeader}>
                            <Text style={styles.rangeLabel}>{from} - {to}</Text>
                            <Text style={styles.rangeMeta}>{loadingRange ? "Yuklanmoqda..." : range ? "Tayyor" : ""}</Text>
                        </View>

                        {loadingRange ? (
                            <ActivityIndicator color={colors.ink} />
                        ) : rangeTotals ? (
                            <>
                                <View style={styles.rangeGrid}>
                                    <View style={styles.rangeTile}>
                                        <Text style={styles.tileLabel}>Kirim</Text>
                                        <Text style={styles.tileValue}>{fmt(rangeTotals.receiptsTotal)}</Text>
                                        <Text style={styles.tileHint}>{rangeTotals.receiptsCount} ta</Text>
                                    </View>
                                    <View style={styles.rangeTile}>
                                        <Text style={styles.tileLabel}>Sotuv</Text>
                                        <Text style={styles.tileValue}>{fmt(rangeTotals.salesTotal)}</Text>
                                        <Text style={styles.tileHint}>{rangeTotals.salesCount} ta</Text>
                                    </View>
                                    <View style={styles.rangeTile}>
                                        <Text style={styles.tileLabel}>Xarajat</Text>
                                        <Text style={styles.tileValue}>{fmt(rangeTotals.expensesTotal ?? 0)}</Text>
                                        <Text style={styles.tileHint}>{rangeTotals.expensesCount ?? 0} ta</Text>
                                    </View>
                                </View>
                                <View style={styles.netRow}>
                                    <Text style={styles.tileLabel}>Net (Sotuv - Kirim - Xarajat)</Text>
                                    <Text style={styles.netValue}>{fmt(rangeTotals.salesTotal - rangeTotals.receiptsTotal - (rangeTotals.expensesTotal ?? 0))}</Text>
                                </View>
                            </>
                        ) : (
                            <Text style={styles.emptyText}>Malumot yoq</Text>
                        )}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Mijozlar boyicha summalar</Text>
                    <View style={styles.rangeCard}>
                        {!range ? (
                            <Text style={styles.emptyText}>Malumot yoq</Text>
                        ) : (
                            <>
                                <View style={styles.rangeGrid}>
                                    <View style={styles.rangeTile}>
                                        <Text style={styles.tileLabel}>Oddiy mijoz</Text>
                                        <Text style={styles.tileValue}>{fmt(customerSummary.regularSalesTotal)}</Text>
                                        <Text style={styles.tileHint}>{customerSummary.regularSalesCount} ta sotuv</Text>
                                    </View>
                                    <View style={styles.rangeTile}>
                                        <Text style={styles.tileLabel}>Sodiq mijoz</Text>
                                        <Text style={styles.tileValue}>{fmt(customerSummary.loyalSalesTotal)}</Text>
                                        <Text style={styles.tileHint}>{customerSummary.loyalSalesCount} ta sotuv</Text>
                                    </View>
                                </View>

                                <View style={styles.netRow}>
                                    <Text style={styles.tileLabel}>Sodiq mijozlar soni</Text>
                                    <Text style={styles.netValue}>{customerSummary.loyalCustomersCount}</Text>
                                </View>

                                <View style={styles.rankWrap}>
                                    <Text style={styles.rankTitle}>Mijoz reytingi</Text>
                                    {customerRanking.length === 0 ? (
                                        <Text style={styles.emptyText}>Reyting uchun malumot yoq</Text>
                                    ) : (
                                        customerRanking.map((item, idx) => (
                                            <View key={`${item.customerId ?? "unknown"}-${idx}`} style={styles.rankRow}>
                                                <View style={styles.rankLeft}>
                                                    <Text style={styles.rankIndex}>{idx + 1}</Text>
                                                    <View>
                                                        <Text style={styles.rankName}>{item.name}</Text>
                                                        <Text style={styles.rankMeta}>{item.phone || "Telefon yoq"}</Text>
                                                    </View>
                                                </View>
                                                <View style={{ alignItems: "flex-end" }}>
                                                    <Text style={styles.rankSum}>{fmt(item.totalSales)}</Text>
                                                    <Text style={styles.rankMeta}>{item.saleCount} ta</Text>
                                                </View>
                                            </View>
                                        ))
                                    )}
                                </View>
                            </>
                        )}
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Kunlik mini-grafik</Text>
                    </View>

                    <View style={styles.presetRow}>
                        {RANGE_PRESETS.map((d) => {
                            const active = sparkDays === d;
                            return (
                                <TouchableOpacity
                                    key={d}
                                    onPress={() => setSparkDays(d)}
                                    style={[styles.sparkPill, active && styles.sparkPillActive]}
                                >
                                    <Text style={[styles.sparkText, active && styles.sparkTextActive]}>{d} kun</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={styles.presetRow}>
                        {SPARK_MODES.map((mode) => {
                            const label =
                                mode === "NON_ZERO"
                                    ? "Faqat aktiv"
                                    : mode === "ALL"
                                    ? "Hamma kun"
                                    : mode === "ONLY_SALES"
                                    ? "Faqat sotuv"
                                    : "Faqat kirim";
                            const active = sparkMode === mode;
                            return (
                                <TouchableOpacity
                                    key={mode}
                                    onPress={() => setSparkMode(mode)}
                                    style={[styles.sparkPill, active && styles.sparkPillActive]}
                                >
                                    <Text style={[styles.sparkText, active && styles.sparkTextActive]}>{label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={styles.chartCard}>
                        {loadingRange ? (
                            <ActivityIndicator color={colors.ink} />
                        ) : !range || !range.days || range.days.length === 0 ? (
                            <Text style={styles.emptyText}>Malumot yoq</Text>
                        ) : sparkDaysList.length === 0 ? (
                            <Text style={styles.emptyText}>Filter boyicha yozuv topilmadi</Text>
                        ) : (
                            sparkDaysList
                                .slice()
                                .reverse()
                                .map((d) => {
                                    const saleW = Math.round(((d.salesTotal ?? 0) / sparkMax) * 100);
                                    const recW = Math.round(((d.receiptsTotal ?? 0) / sparkMax) * 100);
                                    return (
                                        <View key={d.date} style={styles.dayRow}>
                                            <View style={styles.dayHead}>
                                                <Text style={styles.dayDate}>{d.date}</Text>
                                                <Text style={styles.dayMeta}>
                                                    Kirim: {fmt(d.receiptsTotal)} | Sotuv: {fmt(d.salesTotal)}
                                                </Text>
                                            </View>

                                            <View style={styles.barBlock}>
                                                <View style={styles.barLabelRow}>
                                                    <Text style={styles.barLabel}>Kirim</Text>
                                                    <Text style={styles.barLabel}>{recW}%</Text>
                                                </View>
                                                <View style={styles.barTrack}>
                                                    <View style={[styles.barFillReceipt, { width: `${recW}%` }]} />
                                                </View>
                                            </View>

                                            <View style={styles.barBlock}>
                                                <View style={styles.barLabelRow}>
                                                    <Text style={styles.barLabel}>Sotuv</Text>
                                                    <Text style={styles.barLabel}>{saleW}%</Text>
                                                </View>
                                                <View style={styles.barTrack}>
                                                    <View style={[styles.barFillSale, { width: `${saleW}%` }]} />
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })
                        )}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Top mahsulotlar</Text>
                    <View style={styles.topCard}>
                        {loadingTop ? (
                            <ActivityIndicator color={colors.ink} />
                        ) : !top || !top.items || top.items.length === 0 ? (
                            <Text style={styles.emptyText}>Malumot yoq</Text>
                        ) : (
                            top.items.map((p, idx) => {
                                const avg = p.qty > 0 ? p.revenue / p.qty : 0;
                                return (
                                    <View key={p.productId} style={[styles.topRow, idx > 0 && styles.topRowBorder]}>
                                        <View style={styles.topInfo}>
                                            <Text style={styles.topName}>{p.name}</Text>
                                            <Text style={styles.topMeta}>{p.unit}</Text>
                                        </View>
                                        <View style={styles.topValues}>
                                            <Text style={styles.topValue}>{fmt(p.qty)}</Text>
                                            <Text style={styles.topValue}>{fmt(p.revenue)}</Text>
                                            <Text style={styles.topValue}>{fmt(avg)}</Text>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Kam qolgan mahsulotlar</Text>
                    <View style={styles.lowCard}>
                        {loadingSummary ? (
                            <ActivityIndicator color={colors.ink} />
                        ) : !summary || summary.stock.lowStock.length === 0 ? (
                            <Text style={styles.emptyText}>Hammasi joyida</Text>
                        ) : (
                            summary.stock.lowStock.map((item) => (
                                <View key={item.id} style={styles.lowRow}>
                                    <View>
                                        <Text style={styles.lowName}>{item.name}</Text>
                                        <Text style={styles.lowMeta}>
                                            {item.stockQty} / min {item.minQty}
                                        </Text>
                                    </View>
                                    <View style={styles.lowBadge}>
                                        <Text style={styles.lowBadgeText}>Past</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
function StatCard({
    label,
    value,
    hint,
    tone,
    loading,
    anim,
}: {
    label: string;
    value: number;
    hint?: string;
    tone: "receipt" | "sale" | "expense" | "stock" | "low";
    loading: boolean;
    anim: Animated.Value;
}) {
    const toneMap = {
        receipt: { bg: colors.accentSoft, border: "#A7F3D0" },
        sale: { bg: colors.skySoft, border: "#BAE6FD" },
        expense: { bg: colors.roseSoft, border: "#FCA5A5" },
        stock: { bg: colors.coralSoft, border: "#FDBA74" },
        low: { bg: colors.roseSoft, border: "#FCA5A5" },
    } as const;

    return (
        <Animated.View
            style={[
                styles.statCard,
                {
                    backgroundColor: toneMap[tone].bg,
                    borderColor: toneMap[tone].border,
                    opacity: anim,
                    transform: [
                        {
                            translateY: anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [10, 0],
                            }),
                        },
                    ],
                },
            ]}
        >
            <Text style={styles.statLabel}>{label}</Text>
            {loading ? (
                <ActivityIndicator color={colors.ink} />
            ) : (
                <Text style={styles.statValue}>{fmt(value)}</Text>
            )}
            {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
        </Animated.View>
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
        backgroundColor: colors.coralSoft,
        top: -120,
        left: -60,
        opacity: 0.5,
    },
    blobBottom: {
        position: "absolute",
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: colors.skySoft,
        bottom: -140,
        right: -80,
        opacity: 0.45,
    },
    content: {
        padding: 20,
        paddingBottom: 120,
    },
    heroCard: {
        backgroundColor: colors.surface,
        borderRadius: radii.card,
        padding: 18,
        borderWidth: 1,
        borderColor: colors.border,
        ...cardShadow,
    },
    heroRow: {
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
    dateField: {
        flex: 1,
        marginRight: 8,
    },
    inputLabel: {
        fontFamily: fonts.body,
        fontSize: 11,
        color: colors.muted,
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
    actionRow: {
        marginTop: 12,
    },
    primaryButton: {
        backgroundColor: colors.ink,
        paddingVertical: 10,
        borderRadius: radii.pill,
        alignItems: "center",
    },
    primaryText: {
        fontFamily: fonts.heading,
        fontSize: 12,
        color: colors.surface,
    },
    presetRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: 10,
    },
    presetPill: {
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radii.pill,
        marginRight: 8,
        marginBottom: 8,
    },
    presetText: {
        fontFamily: fonts.heading,
        fontSize: 11,
        color: colors.ink,
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
    section: {
        marginTop: 20,
    },
    sectionTitle: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.ink,
        marginBottom: 12,
    },
    sectionHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    statsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    statCard: {
        width: "48%",
        padding: 14,
        borderRadius: radii.soft,
        borderWidth: 1,
        marginBottom: 12,
    },
    statLabel: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.muted,
    },
    statValue: {
        fontFamily: fonts.display,
        fontSize: 18,
        color: colors.ink,
        marginTop: 6,
    },
    statHint: {
        fontFamily: fonts.body,
        fontSize: 11,
        color: colors.muted,
        marginTop: 4,
    },
    rangeCard: {
        backgroundColor: colors.surface,
        borderRadius: radii.card,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        ...cardShadow,
    },
    rangeHeader: {
        marginBottom: 12,
    },
    rangeLabel: {
        fontFamily: fonts.heading,
        fontSize: 14,
        color: colors.ink,
    },
    rangeMeta: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.muted,
        marginTop: 4,
    },
    rangeGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        flexWrap: "wrap",
        rowGap: 8,
    },
    rangeTile: {
        width: "48%",
        padding: 12,
        borderRadius: radii.soft,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bg,
    },
    tileLabel: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.muted,
    },
    tileValue: {
        fontFamily: fonts.display,
        fontSize: 18,
        color: colors.ink,
        marginTop: 6,
    },
    tileHint: {
        fontFamily: fonts.body,
        fontSize: 11,
        color: colors.muted,
        marginTop: 4,
    },
    netRow: {
        marginTop: 14,
        padding: 12,
        borderRadius: radii.soft,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    netValue: {
        fontFamily: fonts.display,
        fontSize: 20,
        color: colors.ink,
        marginTop: 6,
    },
    rankWrap: {
        marginTop: 14,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 12,
    },
    rankTitle: {
        fontFamily: fonts.heading,
        fontSize: 13,
        color: colors.ink,
        marginBottom: 8,
    },
    rankRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    rankLeft: {
        flexDirection: "row",
        alignItems: "center",
        columnGap: 10,
    },
    rankIndex: {
        fontFamily: fonts.heading,
        fontSize: 12,
        color: colors.ink,
        width: 18,
    },
    rankName: {
        fontFamily: fonts.heading,
        fontSize: 12,
        color: colors.ink,
    },
    rankMeta: {
        fontFamily: fonts.body,
        fontSize: 11,
        color: colors.muted,
        marginTop: 2,
    },
    rankSum: {
        fontFamily: fonts.heading,
        fontSize: 12,
        color: colors.ink,
    },
    sparkPill: {
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radii.pill,
        marginRight: 8,
        marginBottom: 8,
    },
    sparkPillActive: {
        backgroundColor: colors.ink,
        borderColor: colors.ink,
    },
    sparkText: {
        fontFamily: fonts.heading,
        fontSize: 11,
        color: colors.ink,
    },
    sparkTextActive: {
        color: colors.surface,
    },
    chartCard: {
        backgroundColor: colors.surface,
        borderRadius: radii.card,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
        ...cardShadow,
    },
    dayRow: {
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    dayHead: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    dayDate: {
        fontFamily: fonts.heading,
        fontSize: 12,
        color: colors.ink,
    },
    dayMeta: {
        fontFamily: fonts.body,
        fontSize: 11,
        color: colors.muted,
    },
    barBlock: {
        marginBottom: 8,
    },
    barLabelRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    barLabel: {
        fontFamily: fonts.body,
        fontSize: 11,
        color: colors.muted,
    },
    barTrack: {
        height: 8,
        borderRadius: 8,
        backgroundColor: colors.bg,
        overflow: "hidden",
    },
    barFillReceipt: {
        height: 8,
        borderRadius: 8,
        backgroundColor: colors.accent,
    },
    barFillSale: {
        height: 8,
        borderRadius: 8,
        backgroundColor: colors.ink,
    },
    topCard: {
        backgroundColor: colors.surface,
        borderRadius: radii.card,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
        ...cardShadow,
    },
    topRow: {
        paddingVertical: 10,
    },
    topRowBorder: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    topInfo: {
        marginBottom: 8,
    },
    topName: {
        fontFamily: fonts.heading,
        fontSize: 14,
        color: colors.ink,
    },
    topMeta: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.muted,
        marginTop: 4,
    },
    topValues: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    topValue: {
        fontFamily: fonts.heading,
        fontSize: 12,
        color: colors.ink,
        width: "32%",
        textAlign: "right",
    },
    lowCard: {
        backgroundColor: colors.surface,
        borderRadius: radii.card,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
        ...cardShadow,
    },
    lowRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    lowName: {
        fontFamily: fonts.heading,
        fontSize: 14,
        color: colors.ink,
    },
    lowMeta: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.muted,
        marginTop: 4,
    },
    lowBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radii.pill,
        backgroundColor: colors.roseSoft,
    },
    lowBadgeText: {
        fontFamily: fonts.heading,
        fontSize: 11,
        color: "#9F1239",
    },
    emptyText: {
        fontFamily: fonts.body,
        fontSize: 12,
        color: colors.muted,
    },
});

