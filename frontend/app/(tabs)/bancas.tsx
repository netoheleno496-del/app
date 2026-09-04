import { useState, useCallback } from "react";
import { View, Text, Pressable, FlatList, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";

import { makeStyles, useTheme } from "@/src/theme";
import AppHeader from "@/src/components/AppHeader";
import EmptyState from "@/src/components/EmptyState";
import BankrollEditModal from "@/src/components/BankrollEditModal";
import { useBankrolls, useAllBets } from "@/src/lib/queries";
import { Bankroll, computeStats } from "@/src/lib/bets";
import { useSelection } from "@/src/context/SelectionContext";

export default function BancasScreen() {
  const styles = useStyles();
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setSelectedId } = useSelection();

  const bankrolls = useBankrolls();
  const allBets = useAllBets();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Bankroll | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalVisible(true);
  };
  const openEdit = (b: Bankroll) => {
    setEditing(b);
    setModalVisible(true);
  };

  const openBankroll = (b: Bankroll) => {
    Haptics.selectionAsync();
    setSelectedId(b.id);
    router.push("/(tabs)/painel");
  };

  const onRefresh = useCallback(() => {
    bankrolls.refetch();
    allBets.refetch();
  }, [bankrolls, allBets]);

  const data = bankrolls.data || [];
  const bets = allBets.data || [];
  const betsFor = (id: string) => bets.filter((b) => b.bankroll_id === id);

  const renderCard = ({ item, index }: { item: Bankroll; index: number }) => {
    const bBets = betsFor(item.id);
    const s = computeStats(bBets, item.capital);
    const positive = s.lucro >= 0;
    return (
      <Pressable
        testID={`bankroll-card-${index}`}
        onPress={() => openBankroll(item)}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
      >
        <LinearGradient
          colors={positive ? ["rgba(46,191,175,0.10)", "rgba(59,130,246,0.04)"] : ["rgba(148,163,184,0.05)", "transparent"]}
          style={styles.cardGlow}
        />
        <View style={styles.cardTop}>
          <View style={styles.cardTitleWrap}>
            <View style={styles.bankIcon}>
              <MaterialDesignIcons name="wallet" size={18} color={colors.brand} />
            </View>
            <View>
              <Text style={styles.bankName}>{item.name}</Text>
              <Text style={styles.capital}>Capital R$ {item.capital.toFixed(2).replace(".", ",")}</Text>
            </View>
          </View>
          <Pressable
            testID={`bankroll-edit-${index}`}
            onPress={(e) => {
              e.stopPropagation?.();
              openEdit(item);
            }}
            hitSlop={8}
            style={styles.gearBtn}
          >
            <MaterialDesignIcons name="cog-outline" size={18} color={colors.muted} />
          </Pressable>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>ROI</Text>
            <Text style={[styles.metricValue, { color: s.roi >= 0 ? colors.brand : colors.error }]}>
              {s.roi.toFixed(2)}%
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Progressão</Text>
            <Text style={[styles.metricValue, { color: s.prog >= 0 ? colors.success : colors.error }]}>
              {s.prog >= 0 ? "+" : ""}
              {s.prog.toFixed(2)}%
            </Text>
          </View>
        </View>

        <View style={styles.pill}>
          <MaterialDesignIcons name="clock-outline" size={13} color={colors.blue} />
          <Text style={styles.pillText}>
            {s.pendentes} {s.pendentes === 1 ? "aposta pendente" : "apostas pendentes"}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Minhas Bancas"
        right={
          <Pressable onPress={openCreate} style={styles.headerAdd} testID="header-add-bankroll">
            <MaterialDesignIcons name="plus" size={22} color={colors.onBrand} />
          </Pressable>
        }
      />

      {bankrolls.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(i) => i.id}
          renderItem={renderCard}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 96 }]}
          refreshControl={
            <RefreshControl refreshing={bankrolls.isFetching} onRefresh={onRefresh} tintColor={colors.brand} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="wallet-plus-outline"
              title="Nenhuma banca ainda"
              message="Crie sua primeira banca para começar a registrar e acompanhar suas apostas."
              actionLabel="Criar minha primeira banca"
              onAction={openCreate}
            />
          }
          ListFooterComponent={
            data.length > 0 ? (
              <Pressable onPress={openCreate} style={styles.addRow} testID="add-bankroll-row">
                <MaterialDesignIcons name="plus-circle-outline" size={20} color={colors.muted} />
                <Text style={styles.addRowText}>Adicionar banca</Text>
              </Pressable>
            ) : null
          }
        />
      )}

      <BankrollEditModal
        visible={modalVisible}
        bankroll={editing}
        bets={editing ? betsFor(editing.id) : []}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: t.spacing.md, gap: t.spacing.md },
  headerAdd: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: t.colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: t.colors.card,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    gap: t.spacing.md,
    overflow: "hidden",
  },
  cardGlow: { position: "absolute", top: 0, left: 0, right: 0, height: "100%" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitleWrap: { flexDirection: "row", alignItems: "center", gap: t.spacing.md, flexShrink: 1 },
  bankIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(46,191,175,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  bankName: { color: t.colors.text, fontSize: 16, fontWeight: "800" },
  capital: { color: t.colors.dim, fontSize: 11, marginTop: 1 },
  gearBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: t.colors.cardAlt, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: t.colors.border },
  metricsRow: { flexDirection: "row", alignItems: "center", backgroundColor: t.colors.cardAlt, borderRadius: t.radius.md, paddingVertical: t.spacing.md },
  metric: { flex: 1, alignItems: "center", gap: 2 },
  metricDivider: { width: 1, height: 30, backgroundColor: t.colors.border },
  metricLabel: { color: t.colors.muted, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  metricValue: { fontSize: 20, fontWeight: "800" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(59,130,246,0.14)",
    paddingHorizontal: t.spacing.md,
    paddingVertical: 6,
    borderRadius: t.radius.pill,
  },
  pillText: { color: t.colors.blue, fontSize: 12, fontWeight: "700" },
  addRow: {
    marginTop: t.spacing.md,
    height: 56,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderStyle: "dashed",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: t.spacing.sm,
  },
  addRowText: { color: t.colors.muted, fontSize: 14, fontWeight: "600" },
}));
