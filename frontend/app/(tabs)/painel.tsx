import { useMemo } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";
import { useState } from "react";

import { makeStyles, useTheme } from "@/src/theme";
import AppHeader from "@/src/components/AppHeader";
import EmptyState from "@/src/components/EmptyState";
import BankrollEditModal from "@/src/components/BankrollEditModal";
import CasaLogo from "@/src/components/CasaLogo";
import { useBankrolls, useBets } from "@/src/lib/queries";
import { useSelection } from "@/src/context/SelectionContext";
import {
  Aposta,
  Timeframe,
  computeStats,
  filterByPeriod,
  calcLucro,
  signedBRL,
  estadoColor,
  startOfDay,
} from "@/src/lib/bets";

const TABS: { key: Timeframe; label: string }[] = [
  { key: "1d", label: "Hoje" },
  { key: "1s", label: "Semana" },
  { key: "1m", label: "Mês" },
  { key: "1a", label: "Tudo" },
];

export default function PainelScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedId } = useSelection();

  const bankrolls = useBankrolls();
  const bets = useBets(selectedId);
  const [tf, setTf] = useState<Timeframe>("1d");
  const [editVisible, setEditVisible] = useState(false);

  const bankroll = (bankrolls.data || []).find((b) => b.id === selectedId) || null;
  const allBets = bets.data || [];
  const filtered = useMemo(() => filterByPeriod(allBets, tf), [allBets, tf]);
  const stats = useMemo(
    () => computeStats(filtered, bankroll?.capital || 0),
    [filtered, bankroll]
  );

  if (!selectedId || !bankroll) {
    return (
      <View style={styles.root}>
        <AppHeader title="Painel" />
        <EmptyState
          icon="gesture-tap"
          title="Escolha uma banca"
          message="Selecione uma banca na aba Bancas para ver o painel de desempenho."
          actionLabel="Ir para Bancas"
          onAction={() => router.push("/(tabs)/bancas")}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader
        title={bankroll.name}
        subtitle={`Capital R$ ${bankroll.capital.toFixed(2).replace(".", ",")}`}
        dot
        right={
          <Pressable onPress={() => setEditVisible(true)} style={styles.gear} testID="painel-edit">
            <MaterialDesignIcons name="cog-outline" size={20} color={colors.muted} />
          </Pressable>
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={styles.chipRowContent}
      >
        {TABS.map((t) => {
          const active = tf === t.key;
          return (
            <Pressable
              key={t.key}
              testID={`period-${t.key}`}
              onPress={() => {
                Haptics.selectionAsync();
                setTf(t.key);
              }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={bets.isFetching} onRefresh={() => bets.refetch()} tintColor={colors.brand} />
        }
      >
        <View style={styles.statGrid}>
          <StatCard label="Apostas" value={String(stats.count)} color={colors.blue} icon="receipt-text-outline" />
          <StatCard
            label="Lucro"
            value={signedBRL(stats.lucro)}
            color={stats.lucro >= 0 ? colors.success : colors.error}
            icon="cash-multiple"
          />
          <StatCard
            label="ROI"
            value={`${stats.roi.toFixed(2)}%`}
            color={stats.roi >= 0 ? colors.brand : colors.error}
            icon="chart-line"
          />
          <StatCard
            label="Progressão"
            value={`${stats.prog >= 0 ? "+" : ""}${stats.prog.toFixed(2)}%`}
            color={stats.prog >= 0 ? colors.success : colors.error}
            icon="trending-up"
          />
        </View>

        {bets.isLoading ? (
          <ActivityIndicator color={colors.brand} style={{ marginTop: 24 }} />
        ) : (
          <PeriodBreakdown tf={tf} allBets={allBets} filtered={filtered} />
        )}

        <Pressable style={styles.allBtn} onPress={() => router.push("/(tabs)/apostas")} testID="ver-apostas">
          <Text style={styles.allBtnText}>Ver todas as apostas</Text>
          <MaterialDesignIcons name="arrow-right" size={18} color={colors.text} />
        </Pressable>
      </ScrollView>

      <BankrollEditModal
        visible={editVisible}
        bankroll={bankroll}
        bets={allBets}
        onClose={() => setEditVisible(false)}
        onDeleted={() => router.replace("/(tabs)/bancas")}
      />
    </View>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.statCard}>
      <View style={styles.statHead}>
        <Text style={styles.statLabel}>{label}</Text>
        <MaterialDesignIcons name={icon as any} size={16} color={colors.dim} />
      </View>
      <Text style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function PeriodBreakdown({ tf, allBets, filtered }: { tf: Timeframe; allBets: Aposta[]; filtered: Aposta[] }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const today = startOfDay(new Date());

  if (tf === "1d") {
    if (filtered.length === 0) {
      return (
        <View style={styles.breakCard}>
          <Text style={styles.breakTitle}>Nenhuma aposta hoje</Text>
          <Text style={styles.breakSub}>As apostas de hoje aparecem aqui automaticamente.</Text>
        </View>
      );
    }
    return (
      <View style={styles.breakCard}>
        <Text style={styles.breakTitle}>Apostas de hoje</Text>
        {filtered.slice(0, 6).map((a) => {
          const c = estadoColor(a.estado);
          return (
            <View key={a.id} style={styles.miniRow}>
              <CasaLogo name={a.casa} size={30} />
              <View style={{ flex: 1 }}>
                <Text style={styles.miniTitle} numberOfLines={1}>{a.titulo}</Text>
                <Text style={styles.miniMeta}>R$ {a.valor} @ {a.cotacao} • {a.hora}</Text>
              </View>
              <View style={[styles.miniBadge, { backgroundColor: c + "22" }]}>
                <Text style={[styles.miniBadgeText, { color: c }]}>{a.estado}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  if (tf === "1s") {
    const nomes = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const inicio = new Date(today);
    inicio.setDate(today.getDate() + diff);
    const dias = nomes.map((label, i) => {
      const dt = new Date(inicio);
      dt.setDate(inicio.getDate() + i);
      const dayBets = allBets.filter((a) => startOfDay(new Date(a.data)).getTime() === startOfDay(dt).getTime());
      return { label, day: dt.getDate(), lucro: dayBets.reduce((s, a) => s + calcLucro(a), 0), count: dayBets.length, isToday: startOfDay(dt).getTime() === today.getTime() };
    });
    return (
      <View style={styles.breakCard}>
        <Text style={styles.breakTitle}>Esta semana</Text>
        <View style={styles.weekGrid}>
          {dias.map((d, i) => (
            <View key={i} style={[styles.weekCell, d.isToday && { borderColor: colors.blue }]}>
              <Text style={styles.weekLabel}>{d.label}</Text>
              <Text style={styles.weekDay}>{d.day}</Text>
              <Text style={[styles.weekValue, { color: d.lucro > 0 ? colors.success : d.lucro < 0 ? colors.error : colors.dim }]}>
                {d.lucro === 0 ? "0" : `${d.lucro > 0 ? "+" : ""}${d.lucro.toFixed(0)}`}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (tf === "1m") {
    const year = today.getFullYear();
    const month = today.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const ranges = [[1, 7], [8, 14], [15, 21], [22, lastDay]];
    return (
      <View style={styles.breakCard}>
        <Text style={styles.breakTitle}>Este mês por semana</Text>
        <View style={styles.monthGrid}>
          {ranges.map((r, idx) => {
            const b = allBets.filter((a) => {
              const d = new Date(a.data);
              return d.getMonth() === month && d.getFullYear() === year && d.getDate() >= r[0] && d.getDate() <= r[1];
            });
            const lucro = b.reduce((s, a) => s + calcLucro(a), 0);
            return (
              <View key={idx} style={styles.monthCell}>
                <Text style={styles.weekLabel}>Semana {idx + 1}</Text>
                <Text style={[styles.monthValue, { color: lucro > 0 ? colors.success : lucro < 0 ? colors.error : colors.muted }]}>
                  {lucro === 0 ? "R$ 0" : signedBRL(lucro)}
                </Text>
                <Text style={styles.miniMeta}>{b.length} apostas</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // 1a
  const nomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const year = today.getFullYear();
  return (
    <View style={styles.breakCard}>
      <Text style={styles.breakTitle}>Ano {year}</Text>
      <View style={styles.yearGrid}>
        {nomes.map((label, m) => {
          const b = allBets.filter((a) => {
            const d = new Date(a.data);
            return d.getMonth() === m && d.getFullYear() === year;
          });
          const lucro = b.reduce((s, a) => s + calcLucro(a), 0);
          return (
            <View key={m} style={styles.yearCell}>
              <Text style={styles.weekLabel}>{label}</Text>
              <Text style={[styles.yearValue, { color: lucro > 0 ? colors.success : lucro < 0 ? colors.error : colors.dim }]}>
                {lucro === 0 ? "0" : `${lucro > 0 ? "+" : ""}${lucro.toFixed(0)}`}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.surface },
  gear: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.colors.card, borderWidth: 1, borderColor: t.colors.border, alignItems: "center", justifyContent: "center" },
  chipRow: { flexGrow: 0, backgroundColor: t.colors.surface, borderBottomWidth: 1, borderBottomColor: t.colors.divider },
  chipRowContent: { paddingHorizontal: t.spacing.md, paddingVertical: t.spacing.md, gap: t.spacing.sm, alignItems: "center" },
  chip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.chip,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  chipActive: { backgroundColor: t.colors.text, borderColor: t.colors.text },
  chipText: { color: t.colors.muted, fontSize: 13, fontWeight: "700" },
  chipTextActive: { color: t.colors.surface },
  scroll: { padding: t.spacing.md, gap: t.spacing.md },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: t.spacing.md },
  statCard: {
    width: "47.8%",
    flexGrow: 1,
    backgroundColor: t.colors.card,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    gap: t.spacing.sm,
  },
  statHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statLabel: { color: t.colors.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  statValue: { fontSize: 22, fontWeight: "800" },
  breakCard: { backgroundColor: t.colors.card, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.lg, gap: t.spacing.md },
  breakTitle: { color: t.colors.text, fontSize: 14, fontWeight: "800" },
  breakSub: { color: t.colors.muted, fontSize: 12 },
  miniRow: { flexDirection: "row", alignItems: "center", gap: t.spacing.md },
  miniTitle: { color: t.colors.text, fontSize: 13, fontWeight: "600" },
  miniMeta: { color: t.colors.dim, fontSize: 11, marginTop: 1 },
  miniBadge: { paddingHorizontal: t.spacing.sm, paddingVertical: 4, borderRadius: t.radius.sm },
  miniBadgeText: { fontSize: 10, fontWeight: "800" },
  weekGrid: { flexDirection: "row", gap: 6 },
  weekCell: { flex: 1, backgroundColor: t.colors.cardAlt, borderRadius: t.radius.sm, borderWidth: 1, borderColor: t.colors.border, alignItems: "center", paddingVertical: t.spacing.sm, gap: 2 },
  weekLabel: { color: t.colors.muted, fontSize: 10, fontWeight: "700" },
  weekDay: { color: t.colors.faint, fontSize: 9 },
  weekValue: { fontSize: 12, fontWeight: "800" },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: t.spacing.sm },
  monthCell: { width: "47.5%", flexGrow: 1, backgroundColor: t.colors.cardAlt, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.md, gap: 3 },
  monthValue: { fontSize: 15, fontWeight: "800" },
  yearGrid: { flexDirection: "row", flexWrap: "wrap", gap: t.spacing.sm },
  yearCell: { width: "30.5%", flexGrow: 1, backgroundColor: t.colors.cardAlt, borderRadius: t.radius.sm, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.sm, gap: 2 },
  yearValue: { fontSize: 14, fontWeight: "800" },
  allBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: t.spacing.sm,
    height: 50,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.card,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  allBtnText: { color: t.colors.text, fontSize: 14, fontWeight: "700" },
}));
