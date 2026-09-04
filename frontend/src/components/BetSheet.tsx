import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { useRouter } from "expo-router";

import { makeStyles, useTheme } from "@/src/theme";
import {
  Aposta,
  ESTADOS,
  EstadoAposta,
  estadoColor,
  esporteIcon,
  calcLucro,
  signedBRL,
} from "@/src/lib/bets";
import CasaLogo from "@/src/components/CasaLogo";
import { useUpdateBet, useDeleteBet } from "@/src/lib/queries";
import { useToast } from "@/src/context/ToastContext";

interface Props {
  bet: Aposta | null;
  onClose: () => void;
}

export default function BetSheet({ bet, onClose }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const updateBet = useUpdateBet();
  const deleteBet = useDeleteBet();
  const toast = useToast();

  const changeStatus = (estado: EstadoAposta) => {
    if (!bet) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateBet.mutate(
      { id: bet.id, estado },
      { onSuccess: () => toast.show(`Status: ${estado}`, "info") }
    );
    onClose();
  };

  const remove = () => {
    if (!bet) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    deleteBet.mutate(bet.id, { onSuccess: () => toast.show("Aposta excluída", "error") });
    onClose();
  };

  const edit = () => {
    if (!bet) return;
    onClose();
    router.push({ pathname: "/add-bet", params: { editId: bet.id } });
  };

  const lucro = bet ? calcLucro(bet) : 0;

  return (
    <Modal visible={!!bet} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="bet-sheet-backdrop">
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
          <View style={styles.handle} />
          {bet && (
            <>
              <View style={styles.headerRow}>
                <CasaLogo name={bet.casa} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={2}>
                    {bet.titulo}
                  </Text>
                  <View style={styles.metaRow}>
                    <MaterialDesignIcons name={esporteIcon(bet.esporte) as any} size={13} color={colors.muted} />
                    <Text style={styles.meta}>
                      {bet.casa} • R$ {bet.valor} @ {bet.cotacao}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.profitBox}>
                <Text style={styles.profitLabel}>Resultado</Text>
                <Text
                  style={[
                    styles.profitValue,
                    { color: lucro > 0 ? colors.success : lucro < 0 ? colors.error : colors.muted },
                  ]}
                >
                  {bet.estado === "Pendente" ? "Em aberto" : signedBRL(lucro)}
                </Text>
              </View>

              <Text style={styles.sectionLabel}>Alterar status</Text>
              <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                <View style={styles.grid}>
                  {ESTADOS.map((st) => {
                    const sel = bet.estado === st;
                    const c = estadoColor(st);
                    return (
                      <Pressable
                        key={st}
                        testID={`status-${st}`}
                        onPress={() => changeStatus(st)}
                        style={[
                          styles.statusBtn,
                          { borderColor: sel ? c : colors.border, backgroundColor: sel ? c + "22" : "transparent" },
                        ]}
                      >
                        <View style={[styles.statusDot, { backgroundColor: c }]} />
                        <Text style={[styles.statusText, { color: sel ? colors.text : colors.muted }]}>
                          {st}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={styles.actions}>
                <Pressable style={styles.deleteBtn} onPress={remove} testID="bet-delete">
                  <MaterialDesignIcons name="trash-can-outline" size={18} color={colors.error} />
                  <Text style={styles.deleteText}>Excluir</Text>
                </Pressable>
                <Pressable style={styles.editBtn} onPress={edit} testID="bet-edit">
                  <MaterialDesignIcons name="pencil" size={18} color={colors.onDark} />
                  <Text style={styles.editText}>Editar</Text>
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: t.colors.card,
    borderTopLeftRadius: t.radius.lg,
    borderTopRightRadius: t.radius.lg,
    borderTopWidth: 1,
    borderColor: t.colors.border,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.md,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.borderStrong, alignSelf: "center", marginBottom: t.spacing.lg },
  headerRow: { flexDirection: "row", gap: t.spacing.md, alignItems: "center" },
  title: { color: t.colors.text, fontSize: 15, fontWeight: "800" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  meta: { color: t.colors.muted, fontSize: 12 },
  profitBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: t.colors.cardAlt,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    marginTop: t.spacing.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  profitLabel: { color: t.colors.muted, fontSize: 12, fontWeight: "600" },
  profitValue: { fontSize: 18, fontWeight: "800" },
  sectionLabel: { color: t.colors.muted, fontSize: 12, fontWeight: "700", marginTop: t.spacing.lg, marginBottom: t.spacing.sm, textTransform: "uppercase", letterSpacing: 0.5 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: t.spacing.sm },
  statusBtn: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.sm,
    height: 44,
    borderRadius: t.radius.md,
    borderWidth: 1,
    paddingHorizontal: t.spacing.md,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "700" },
  actions: { flexDirection: "row", gap: t.spacing.md, marginTop: t.spacing.lg },
  deleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: t.radius.md,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: t.spacing.sm,
  },
  deleteText: { color: t.colors.error, fontSize: 14, fontWeight: "800" },
  editBtn: {
    flex: 1,
    height: 48,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: t.spacing.sm,
  },
  editText: { color: t.colors.onBrand, fontSize: 14, fontWeight: "800" },
}));
