import { View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";

import { makeStyles, useTheme } from "@/src/theme";
import AppHeader from "@/src/components/AppHeader";
import { useAuth } from "@/src/context/AuthContext";
import { useBankrolls, useAllBets } from "@/src/lib/queries";
import { computeStats, signedBRL } from "@/src/lib/bets";

export default function MaisScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const bankrolls = useBankrolls();
  const allBets = useAllBets();

  const totalStats = computeStats(allBets.data || [], 1);
  const bankCount = (bankrolls.data || []).length;

  const logout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
    router.replace("/login");
  };

  const initials = (user?.name || user?.email || "?").slice(0, 2).toUpperCase();

  return (
    <View style={styles.root}>
      <AppHeader title="Mais" />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 96 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name || "Apostador"}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.overviewRow}>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewValue}>{bankCount}</Text>
            <Text style={styles.overviewLabel}>Bancas</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewValue}>{totalStats.count}</Text>
            <Text style={styles.overviewLabel}>Apostas</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={[styles.overviewValue, { color: totalStats.lucro >= 0 ? colors.success : colors.error, fontSize: 15 }]}>
              {signedBRL(totalStats.lucro)}
            </Text>
            <Text style={styles.overviewLabel}>Lucro total</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <MaterialDesignIcons name="cloud-check-outline" size={22} color={colors.brand} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Sincronização ativa</Text>
            <Text style={styles.infoText}>
              Suas bancas e apostas ficam salvas na sua conta. Faça login em qualquer celular para acessá-las.
            </Text>
          </View>
        </View>

        <Pressable style={styles.logoutBtn} onPress={logout} testID="logout-button">
          <MaterialDesignIcons name="logout" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </Pressable>

        <Text style={styles.version}>Peixe Esperto • v1.0</Text>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.surface },
  scroll: { padding: t.spacing.md, gap: t.spacing.md },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.lg,
    backgroundColor: t.colors.card,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(46,191,175,0.14)",
    borderWidth: 1,
    borderColor: "rgba(46,191,175,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: t.colors.brand, fontSize: 20, fontWeight: "800" },
  name: { color: t.colors.text, fontSize: 17, fontWeight: "800" },
  email: { color: t.colors.muted, fontSize: 13, marginTop: 2 },
  overviewRow: { flexDirection: "row", gap: t.spacing.md },
  overviewCard: {
    flex: 1,
    backgroundColor: t.colors.card,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    paddingVertical: t.spacing.lg,
    alignItems: "center",
    gap: 4,
  },
  overviewValue: { color: t.colors.text, fontSize: 20, fontWeight: "800" },
  overviewLabel: { color: t.colors.muted, fontSize: 11, fontWeight: "600" },
  infoCard: {
    flexDirection: "row",
    gap: t.spacing.md,
    backgroundColor: "rgba(46,191,175,0.08)",
    borderWidth: 1,
    borderColor: "rgba(46,191,175,0.25)",
    borderRadius: t.radius.md,
    padding: t.spacing.lg,
    alignItems: "center",
  },
  infoTitle: { color: t.colors.text, fontSize: 14, fontWeight: "800" },
  infoText: { color: t.colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 2 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: t.spacing.sm,
    height: 52,
    borderRadius: t.radius.md,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    marginTop: t.spacing.sm,
  },
  logoutText: { color: t.colors.error, fontSize: 15, fontWeight: "800" },
  version: { color: t.colors.faint, fontSize: 12, textAlign: "center", marginTop: t.spacing.md },
}));
