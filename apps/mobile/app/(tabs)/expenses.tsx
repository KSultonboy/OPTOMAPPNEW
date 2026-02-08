import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiGet, apiPost, apiPatch } from "../../lib/api";
import { colors, fonts, radii, cardShadow } from "../../theme";

type Category = {
  id: string;
  name: string;
};

type Expense = {
  id: string;
  name: string;
  amount: number;
  note?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  createdAt: string;
};

function fmt(n: number) {
  return Number(n || 0).toLocaleString("uz-UZ", { maximumFractionDigits: 0 });
}

export default function ExpensesScreen() {
  const [items, setItems] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const headerAnim = useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [expRes, catRes] = await Promise.all([
        apiGet<{ items: Expense[] }>("/api/expenses?limit=120"),
        apiGet<{ items: Category[] }>("/api/expense-categories")
      ]);
      setItems(expRes.items || []);
      setCategories(catRes.items || []);
    } catch (e: any) {
      setError(e?.message || "Ma'lumotlarni olishda xatolik");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    headerAnim.setValue(0);
    Animated.timing(headerAnim, { toValue: 1, duration: 380, useNativeDriver: true }).start();
  }, [headerAnim]);

  const totalToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return items
      .filter((x) => new Date(x.createdAt) >= today)
      .reduce((s, x) => s + (x.amount || 0), 0);
  }, [items]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  async function onSave() {
    const nm = name.trim();
    if (!nm) {
      setError("Nomi talab qilinadi");
      return;
    }
    const val = Number(amount);
    if (!(val > 0)) {
      setError("Summani to'g'ri kiriting");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: nm,
        amount: val,
        note: note.trim() || undefined,
        categoryId: categoryId || undefined
      };
      if (editingId) {
        await apiPatch(`/api/expenses/${editingId}`, payload);
      } else {
        await apiPost("/api/expenses", payload);
      }
      setName("");
      setAmount("");
      setNote("");
      setCategoryId("");
      setEditingId(null);
      await fetchData();
    } catch (e: any) {
      setError(e?.message || "Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  }

  function onStartEdit(x: Expense) {
    setEditingId(x.id);
    setName(x.name || "");
    setAmount(String(x.amount ?? ""));
    setNote(x.note || "");
    setCategoryId(x.categoryId || "");
  }

  function onCancelEdit() {
    setEditingId(null);
    setName("");
    setAmount("");
    setNote("");
    setCategoryId("");
    setError(null);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View pointerEvents="none" style={styles.backdrop}>
        <View style={styles.blobTop} />
        <View style={styles.blobBottom} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        ListHeaderComponent={
          <Animated.View
            style={[
              styles.headerCard,
              {
                opacity: headerAnim,
                transform: [
                  {
                    translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.title}>Xarajatlar</Text>
                <Text style={styles.subtitle}>Kiritish va tahrirlash</Text>
              </View>
              <View style={styles.todayBadge}>
                <Text style={styles.todayLabel}>Bugun:</Text>
                <Text style={styles.todayValue}>{fmt(totalToday)}</Text>
              </View>
            </View>

            {error ? (
              <TouchableOpacity onPress={() => setError(null)} style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.formRow}>
              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>Xarajat nomi</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Masalan: Ijara..."
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                />
              </View>

              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>Summa</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { fontWeight: "bold" }]}
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>Kategoriya</Text>
                <View style={styles.categoryScrollWrap}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                    <TouchableOpacity
                      onPress={() => setCategoryId("")}
                      style={[styles.catItem, categoryId === "" && styles.catItemActive]}
                    >
                      <Text style={[styles.catText, categoryId === "" && styles.catTextActive]}>Hammasi</Text>
                    </TouchableOpacity>
                    {categories.map(c => (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => setCategoryId(c.id)}
                        style={[styles.catItem, categoryId === c.id && styles.catItemActive]}
                      >
                        <Text style={[styles.catText, categoryId === c.id && styles.catTextActive]}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formCol, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Izoh (ixtiyoriy)</Text>
                <TextInput value={note} onChangeText={setNote} placeholder="Batafsil..." placeholderTextColor={colors.muted} style={styles.input} />
              </View>
            </View>

            <View style={styles.actionRow}>
              {editingId && (
                <TouchableOpacity style={styles.cancelButton} onPress={onCancelEdit}>
                  <Text style={styles.cancelText}>Bekor</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.saveButton} onPress={onSave} disabled={saving}>
                <Text style={styles.saveText}>{saving ? "..." : editingId ? "Yangilash" : "Saqlash"}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => onStartEdit(item)} activeOpacity={0.8}>
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <View style={styles.rowHeader}>
                  <Text style={styles.rowName}>{item.name || "Xarajat"}</Text>
                  {item.category && (
                    <View style={styles.rowCatBadge}>
                      <Text style={styles.rowCatText}>{item.category.name}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.rowMeta}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {item.note ? `• ${item.note}` : ""}</Text>
              </View>
              <Text style={styles.rowValue}>{fmt(item.amount)}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={loading ? (
          <View style={styles.emptyWrap}><ActivityIndicator color={colors.ink} /></View>
        ) : (
          <View style={styles.emptyWrap}><Text style={styles.emptyText}>Hozircha yozuv yoq</Text></View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  backdrop: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  blobTop: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: colors.accentSoft, top: -110, right: -60, opacity: 0.5 },
  blobBottom: { position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: colors.coralSoft, bottom: -130, left: -80, opacity: 0.45 },
  listContent: { padding: 16, paddingBottom: 120 },
  headerCard: { backgroundColor: "#FFFFFFEE", borderRadius: radii.card, padding: 16, borderWidth: 1, borderColor: colors.border, ...cardShadow, marginBottom: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
  todayBadge: { backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.soft, borderWidth: 1, borderColor: colors.border, alignItems: "flex-end" },
  todayLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.muted },
  todayValue: { fontFamily: fonts.display, fontSize: 14, color: colors.ink, fontWeight: "bold" },
  errorBanner: { marginTop: 12, padding: 10, backgroundColor: colors.roseSoft, borderRadius: radii.soft, borderWidth: 1, borderColor: "#FCA5A5" },
  errorText: { fontFamily: fonts.body, fontSize: 12, color: "#9F1239", textAlign: "center" },
  formRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  formCol: { flex: 1 },
  inputLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginBottom: 4, marginLeft: 4 },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: "#FFF", paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.soft, fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  categoryScrollWrap: { height: 36, marginTop: 2 },
  categoryScroll: { gap: 8, paddingRight: 10 },
  catItem: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  catItemActive: { backgroundColor: colors.ink },
  catText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  catTextActive: { color: "#FFF", fontWeight: "bold" },
  actionRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 16 },
  saveButton: { backgroundColor: colors.ink, paddingHorizontal: 24, paddingVertical: 10, borderRadius: radii.pill },
  saveText: { fontFamily: fonts.heading, fontSize: 13, color: "#FFF", fontWeight: "bold" },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border },
  cancelText: { fontFamily: fonts.heading, fontSize: 13, color: colors.muted },
  row: { backgroundColor: "#FFFFFFCC", borderRadius: radii.card, padding: 15, borderWidth: 1, borderColor: colors.border, ...cardShadow, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowInfo: { flex: 1 },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowName: { fontFamily: fonts.heading, fontSize: 15, color: colors.ink, fontWeight: "600" },
  rowCatBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: "#F3F4F6" },
  rowCatText: { fontSize: 10, color: colors.muted, fontWeight: "bold" },
  rowMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 4 },
  rowValue: { fontFamily: fonts.display, fontSize: 17, color: colors.ink, textAlign: "right", fontWeight: "bold" },
  emptyWrap: { padding: 40, alignItems: "center" },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
});

