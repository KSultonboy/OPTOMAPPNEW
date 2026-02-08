import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiDelete, apiGet, apiPost, apiPut } from "../../lib/api";
import { cardShadow, colors, fonts, radii } from "../../theme";

type Customer = {
  id: string;
  name: string;
  phone?: string | null;
  note?: string | null;
  totalSales?: number;
  saleCount?: number;
};

function fmt(n: number) {
  return Number(n || 0).toLocaleString("uz-UZ");
}

export default function CustomersScreen() {
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchCustomers = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const search = (q ?? query).trim();
      const path = search ? `/api/customers?q=${encodeURIComponent(search)}` : "/api/customers";
      const res = await apiGet<{ items: Customer[] }>(path);
      setItems(res.items || []);
    } catch (e: any) {
      setError(e?.message || "Mijozlarni olishda xatolik");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(query), 300);
    return () => clearTimeout(t);
  }, [query, fetchCustomers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  }, [fetchCustomers]);

  const totals = useMemo(() => {
    return {
      count: items.length,
      totalSales: items.reduce((sum, c) => sum + Number(c.totalSales || 0), 0),
    };
  }, [items]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setPhone("");
    setNote("");
  }

  async function onSave() {
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Mijoz nomi majburiy");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: cleanName,
        phone: phone.trim() || null,
        note: note.trim() || null,
      };

      if (editingId) {
        await apiPut(`/api/customers/${editingId}`, payload);
      } else {
        await apiPost("/api/customers", payload);
      }

      resetForm();
      await fetchCustomers();
    } catch (e: any) {
      setError(e?.message || "Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: Customer) {
    setEditingId(item.id);
    setName(item.name || "");
    setPhone(item.phone || "");
    setNote(item.note || "");
  }

  async function onDelete(item: Customer) {
    setSaving(true);
    setError(null);
    try {
      await apiDelete(`/api/customers/${item.id}`);
      await fetchCustomers();
    } catch (e: any) {
      setError(e?.message || "Ochirishda xatolik");
    } finally {
      setSaving(false);
    }
  }

  const header = (
    <View style={styles.headerCard}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Mijozlar</Text>
          <Text style={styles.subtitle}>Asosiy mijozlar royxati</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={() => fetchCustomers()}>
          <Text style={styles.refreshText}>Yangilash</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Mijozlar</Text>
          <Text style={styles.statValue}>{totals.count}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Umumiy sotuv</Text>
          <Text style={styles.statValue}>{fmt(totals.totalSales)}</Text>
        </View>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Mijoz qidirish..."
        placeholderTextColor={colors.muted}
        style={styles.input}
      />

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.formWrap}>
        <Text style={styles.formTitle}>{editingId ? "Mijozni tahrirlash" : "Yangi mijoz"}</Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Mijoz nomi"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Telefon"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Izoh"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <View style={styles.actionRow}>
          {editingId ? (
            <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
              <Text style={styles.cancelText}>Bekor</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.saveButton} onPress={onSave} disabled={saving}>
            <Text style={styles.saveText}>{saving ? "..." : editingId ? "Yangilash" : "Saqlash"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View pointerEvents="none" style={styles.backdrop}>
        <View style={styles.blobTop} />
        <View style={styles.blobBottom} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardMeta}>{item.phone || "Telefon yoq"}</Text>
                {item.note ? <Text style={styles.cardMeta}>{item.note}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => startEdit(item)} style={styles.editButton}>
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsLine}>
              <Text style={styles.cardMeta}>Sotuvlar: {item.saleCount ?? 0}</Text>
              <Text style={styles.cardTotal}>{fmt(item.totalSales ?? 0)}</Text>
            </View>

            <TouchableOpacity onPress={() => onDelete(item)} style={styles.deleteButton} disabled={saving}>
              <Text style={styles.deleteButtonText}>Ochirish</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator color={colors.ink} />
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Hozircha mijoz yoq</Text>
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
    gap: 10,
  },
  statCard: {
    flex: 1,
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
    marginTop: 10,
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
  formWrap: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  formTitle: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 4,
  },
  actionRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  saveButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  saveText: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: colors.surface,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  cancelText: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: colors.ink,
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
    justifyContent: "space-between",
    alignItems: "center",
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
  statsLine: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTotal: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.ink,
  },
  editButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.soft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editButtonText: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.ink,
  },
  deleteButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: radii.soft,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.roseSoft,
    alignItems: "center",
  },
  deleteButtonText: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: "#9F1239",
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

