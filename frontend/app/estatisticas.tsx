import { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PieChart } from "react-native-gifted-charts";
import * as Haptics from "expo-haptics";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";

import { makeStyles, useTheme } from "@/src/theme";
import AppHeader from "@/src/components/AppHeader";
import EmptyState from "@/src/components/EmptyState";
import CasaLogo from "@/src/components/CasaLogo";
import { useBankrolls, useBets } from "@/src/lib/queries";
import { useSelection } from "@/src/context/SelectionContext";
import {
  Timeframe,
  filterByPeriod,
  computeAdvancedStats,
  esporteIcon,
  signedBRL,
  calcLucro,
} from "@/src/lib/bets";

const TABS: { key: Timeframe; label: string }[] = [
  { key: "1s", label: "Semana" },
  { key: "1m", label: "Mês" },
  { key: "1a", label: "Tudo" },
];

export default function EstatisticasScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedId } = useSelection();

  const bankrolls = useBankrolls();
  const betsQ = useBets(selectedId);
  const [tf, setTf] = useState<Timeframe>("1a");

  const bankroll = (bankrolls.data || []).find((b) => b.id === selectedId) || null;
  const filtered = useMemo(() => filterByPeriod(betsQ.data || [], tf), [betsQ.data, tf]);
  const stats = useMemo(() => computeAdvancedStats(filtered), [filtered]);

  if (!selectedId || !bankroll) {
    return (
      <View style={styles.root}>
        <AppHeader title="Estatísticas" onBack={() => router.back()} />
        <EmptyState
          icon="chart-arc"
          title="Escolha uma banca"
          message="Selecione uma banca para ver seus gráficos e padrões."
          actionLabel="Ir para Bancas"
          onAction={() => router.replace("/(tabs)/bancas")}
        />
      </View>
    );
  }

  const maxAbs = Math.max(1, ...stats.bySport.map((s) => Math.abs(s.lucro)));
  const pieData = [
    { value: Math.max(stats.wins, 0.0001), color: colors.success },
    { value: Math.max(stats.losses, 0.0001), color: colors.error },
  ];

  return (
    <View style={styles.root}>
      <AppHeader title="Estatísticas" subtitle={bankroll.name} onBack={() => router.back()} />

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
              testID={`stats-period-${t.key}`}
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

      {betsQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : stats.decided === 0 && stats.bySport.length === 0 ? (
        <EmptyState
          icon="chart-line-variant"
          title="Sem dados ainda"
          message="Registre e finalize apostas (Ganha/Perdida) para desbloquear seus gráficos e padrões."
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Win rate donut */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Taxa de acerto</Text>
            <View style={styles.donutRow}>
              <View style={styles.donutWrap}>
                {stats.decided > 0 ? (
                  <PieChart
                    donut
                    radius={72}
                    innerRadius={50}
                    data={pieData}
                    backgroundColor={colors.card}
                    innerCircleColor={colors.card}
                    centerLabelComponent={() => (
                      <View style={{ alignItems: "center" }}>
                        <Text style={styles.donutPct}>{stats.winRate.toFixed(0)}%</Text>
                        <Text style={styles.donutSub}>acerto</Text>
                      </View>
                    )}
                  />
                ) : (
                  <View style={styles.donutEmpty}>
                    <Text style={styles.donutSub}>sem apostas{"\n"}decididas</Text>
                  </View>
                )}
              </View>
              <View style={styles.legend}>
                <LegendRow color={colors.success} label="Ganhas" value={stats.wins} />
                <LegendRow color={colors.error} label="Perdidas" value={stats.losses} />
                <View style={styles.legendDivider} />
                <LegendRow color={colors.blue} label="Decididas" value={stats.decided} />
                <LegendRow
                  color={stats.roi >= 0 ? colors.brand : colors.error}
                  label="ROI"
                  value={`${stats.roi.toFixed(1)}%`}
                />
              </View>
            </View>
          </View>

          {/* Streaks */}
          <View style={styles.streakRow}>
            <StreakCard
              icon="fire"
              label="Sequência atual"
              value={
                stats.currentStreak === 0
                  ? "—"
                  : `${Math.abs(stats.currentStreak)} ${stats.currentStreak > 0 ? "V" : "D"}`
              }
              color={stats.currentStreak > 0 ? colors.success : stats.currentStreak < 0 ? colors.error : colors.muted}
            />
            <StreakCard icon="trophy" label="Melhor sequência" value={`${stats.bestWinStreak} V`} color={colors.success} />
            <StreakCard icon="trending-down" label="Pior sequência" value={`${stats.worstLossStreak} D`} color={colors.error} />
          </View>

          {/* Recent form */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Forma recente</Text>
            {stats.form.length === 0 ? (
              <Text style={styles.muted}>Nenhuma aposta decidida ainda.</Text>
            ) : (
              <View style={styles.formRow}>
                {stats.form.map((f, i) => (
                  <View
                    key={i}
                    style={[styles.formDot, { backgroundColor: f.win ? colors.success : colors.error }]}
                  >
                    <Text style={styles.formDotText}>{f.win ? "V" : "D"}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.formHint}>V = vitória · D = derrota (mais recente à direita)</Text>
          </View>

          {/* Profit by sport */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Lucro por esporte</Text>
            {stats.bySport.length === 0 ? (
              <Text style={styles.muted}>Sem apostas registradas.</Text>
            ) : (
              <View style={{ gap: 14, marginTop: 4 }}>
                {stats.bySport.map((s) => {
                  const positive = s.lucro >= 0;
                  const pct = Math.abs(s.lucro) / maxAbs;
                  return (
                    <View key={s.sport} style={styles.sportRow}>
                      <View style={styles.sportHead}>
                        <View style={styles.sportName}>
                          <MaterialDesignIcons name={esporteIcon(s.sport) as any} size={15} color={colors.muted} />
                          <Text style={styles.sportLabel}>{s.sport}</Text>
                          <Text style={styles.sportCount}>({s.count})</Text>
                        </View>
                        <Text style={[styles.sportValue, { color: positive ? colors.success : colors.error }]}>
                          {signedBRL(s.lucro)}
                        </Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${Math.max(pct * 100, 3)}%`, backgroundColor: positive ? colors.success : colors.error },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Highlights */}
          <View style={styles.streakRow}>
            <HighlightCard
              label="Maior ganho"
              bet={stats.biggestWin}
              color={colors.success}
            />
            <HighlightCard label="Maior perda" bet={stats.biggestLoss} color={colors.error} />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number | string }) {
  const styles = useStyles();
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

function StreakCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const styles = useStyles();
  return (
    <View style={styles.streakCard}>
      <MaterialDesignIcons name={icon as any} size={18} color={color} />
      <Text style={[styles.streakValue, { color }]}>{value}</Text>
      <Text style={styles.streakLabel}>{label}</Text>
    </View>
  );
}

function HighlightCard({ label, bet, color }: { label: string; bet: any; color: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.streakCard, { flex: 1, alignItems: "flex-start", gap: 6 }]}>
      <Text style={styles.streakLabel}>{label}</Text>
      {bet ? (
        <>
          <View style={styles.hlHead}>
            <CasaLogo name={bet.casa} size={22} />
            <Text style={[styles.streakValue, { color, fontSize: 15 }]}>{signedBRL(calcLucro(bet))}</Text>
          </View>
          <Text style={styles.hlTitle} numberOfLines={1}>
            {bet.titulo}
          </Text>
        </>
      ) : (
        <Text style={[styles.muted, { color: colors.dim }]}>—</Text>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  card: {
    backgroundColor: t.colors.card,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    gap: t.spacing.md,
  },
  cardTitle: { color: t.colors.text, fontSize: 15, fontWeight: "800" },
  muted: { color: t.colors.muted, fontSize: 13 },
  donutRow: { flexDirection: "row", alignItems: "center", gap: t.spacing.lg },
  donutWrap: { width: 150, height: 150, alignItems: "center", justifyContent: "center" },
  donutEmpty: { width: 144, height: 144, borderRadius: 72, borderWidth: 12, borderColor: t.colors.cardAlt, alignItems: "center", justifyContent: "center" },
  donutPct: { color: t.colors.text, fontSize: 26, fontWeight: "800" },
  donutSub: { color: t.colors.muted, fontSize: 11, textAlign: "center" },
  legend: { flex: 1, gap: t.spacing.sm },
  legendRow: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { color: t.colors.muted, fontSize: 13, flex: 1 },
  legendValue: { color: t.colors.text, fontSize: 14, fontWeight: "800" },
  legendDivider: { height: 1, backgroundColor: t.colors.border, marginVertical: 2 },
  streakRow: { flexDirection: "row", gap: t.spacing.md },
  streakCard: {
    flex: 1,
    backgroundColor: t.colors.card,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.md,
    alignItems: "center",
    gap: 4,
  },
  streakValue: { fontSize: 18, fontWeight: "800" },
  streakLabel: { color: t.colors.muted, fontSize: 11, fontWeight: "600", textAlign: "center" },
  formRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  formDot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  formDotText: { color: t.colors.onDark, fontSize: 11, fontWeight: "800" },
  formHint: { color: t.colors.dim, fontSize: 11 },
  sportRow: { gap: 6 },
  sportHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sportName: { flexDirection: "row", alignItems: "center", gap: 6 },
  sportLabel: { color: t.colors.text, fontSize: 13, fontWeight: "700" },
  sportCount: { color: t.colors.dim, fontSize: 11 },
  sportValue: { fontSize: 13, fontWeight: "800" },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: t.colors.cardAlt, overflow: "hidden" },
  barFill: { height: 10, borderRadius: 5 },
  hlHead: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm },
  hlTitle: { color: t.colors.textSecondary, fontSize: 12 },
}));
