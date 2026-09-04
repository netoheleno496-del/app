import { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";

import { makeStyles, useTheme } from "@/src/theme";
import AppHeader from "@/src/components/AppHeader";
import EmptyState from "@/src/components/EmptyState";
import CasaLogo from "@/src/components/CasaLogo";
import BetSheet from "@/src/components/BetSheet";
import { useBankrolls, useBets } from "@/src/lib/queries";
import { useSelection } from "@/src/context/SelectionContext";
import { Aposta, groupByMonthDay, estadoColor, esporteIcon, signedBRL } from "@/src/lib/bets";

export default function ApostasScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedId } = useSelection();

  const bankrolls = useBankrolls();
  const bets = useBets(selectedId);
  const [selectedBet, setSelectedBet] = useState<Aposta | null>(null);

  const bankroll = (bankrolls.data || []).find((b) => b.id === selectedId) || null;
  const months = useMemo(() => groupByMonthDay(bets.data || []), [bets.data]);

  if (!selectedId || !bankroll) {
    return (
      <View style={styles.root}>
        <AppHeader title="Apostas" />
        <EmptyState
          icon="gesture-tap"
          title="Escolha uma banca"
          message="Selecione uma banca na aba Bancas para ver suas apostas."
          actionLabel="Ir para Bancas"
          onAction={() => router.push("/(tabs)/bancas")}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader title="Apostas" subtitle={bankroll.name} />

      {bets.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 96 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={bets.isFetching} onRefresh={() => bets.refetch()} tintColor={colors.brand} />
          }
        >
          {months.length === 0 ? (
            <EmptyState
              icon="receipt-text-plus-outline"
              title="Nenhuma aposta ainda"
              message="Toque no botão + para registrar sua primeira aposta nesta banca."
              actionLabel="Adicionar aposta"
              onAction={() => router.push("/add-bet")}
            />
          ) : (
            months.map((m) => (
              <View key={m.key} style={styles.monthBlock}>
                <View style={styles.monthHeader}>
                  <Text style={styles.monthTitle}>{m.label}</Text>
                  <Text style={[styles.monthTotal, { color: m.total >= 0 ? colors.success : colors.error }]}>
                    {signedBRL(m.total)}
                  </Text>
                </View>
                {m.days.map((d) => (
                  <View key={d.key} style={styles.dayBlock}>
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayLabel}>{d.label}</Text>
                      <Text style={[styles.dayTotal, { color: Math.abs(d.total) < 0.01 ? colors.muted : d.total >= 0 ? colors.success : colors.error }]}>
                        {signedBRL(d.total)}
                      </Text>
                    </View>
                    {d.apostas.map((a) => {
                      const c = estadoColor(a.estado);
                      return (
                        <Pressable
                          key={a.id}
                          testID={`bet-card-${a.id}`}
                          onPress={() => setSelectedBet(a)}
                          style={({ pressed }) => [styles.betCard, pressed && { opacity: 0.9 }]}
                        >
                          <View style={[styles.strip, { backgroundColor: c }]} />
                          <View style={styles.betBody}>
                            <View style={styles.betTopRow}>
                              <CasaLogo name={a.casa} size={26} />
                              <View style={styles.tagRow}>
                                <View style={styles.tag}>
                                  <MaterialDesignIcons name={esporteIcon(a.esporte) as any} size={11} color={colors.muted} />
                                  <Text style={styles.tagText}>{a.esporte}</Text>
                                </View>
                                <Text style={styles.betHora}>{a.hora}</Text>
                              </View>
                            </View>
                            <Text style={styles.betTitle} numberOfLines={2}>{a.titulo}</Text>
                            <Text style={styles.betMeta}>R$ {a.valor} @ {a.cotacao}</Text>
                          </View>
                          <View style={[styles.betBadge, { backgroundColor: c + "22" }]}>
                            <Text style={[styles.betBadgeText, { color: c }]}>{a.estado}</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}

      <BetSheet bet={selectedBet} onClose={() => setSelectedBet(null)} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: t.spacing.md, gap: t.spacing.lg },
  monthBlock: { gap: t.spacing.sm },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: t.colors.card,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
  },
  monthTitle: { color: t.colors.text, fontSize: 15, fontWeight: "800" },
  monthTotal: { fontSize: 15, fontWeight: "800" },
  dayBlock: { gap: t.spacing.sm },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: t.spacing.xs, marginTop: t.spacing.xs },
  dayLabel: { color: t.colors.textSecondary, fontSize: 12, fontWeight: "600" },
  dayTotal: { fontSize: 12, fontWeight: "800" },
  betCard: {
    flexDirection: "row",
    backgroundColor: t.colors.card,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    overflow: "hidden",
    minHeight: 76,
  },
  strip: { width: 4 },
  betBody: { flex: 1, padding: t.spacing.md, gap: 5 },
  betTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tagRow: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: t.colors.chip, paddingHorizontal: t.spacing.sm, paddingVertical: 3, borderRadius: t.radius.sm },
  tagText: { color: t.colors.muted, fontSize: 10, fontWeight: "600" },
  betHora: { color: t.colors.dim, fontSize: 11 },
  betTitle: { color: t.colors.text, fontSize: 14, fontWeight: "700", lineHeight: 18 },
  betMeta: { color: t.colors.muted, fontSize: 12 },
  betBadge: { alignSelf: "stretch", justifyContent: "center", paddingHorizontal: t.spacing.md },
  betBadgeText: { fontSize: 10, fontWeight: "800", width: 60, textAlign: "center" },
}));
