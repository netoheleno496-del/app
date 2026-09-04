import { useState, useEffect } from "react";
import { Modal, View, Text, TextInput, Pressable } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";

import { makeStyles, useTheme } from "@/src/theme";
import { Aposta, Bankroll, computeStats, signedBRL } from "@/src/lib/bets";
import { useCreateBankroll, useUpdateBankroll, useDeleteBankroll } from "@/src/lib/queries";
import { useToast } from "@/src/context/ToastContext";

interface Props {
  visible: boolean;
  bankroll: Bankroll | null; // null => create mode
  bets?: Aposta[];
  onClose: () => void;
  onDeleted?: () => void;
}

export default function BankrollEditModal({ visible, bankroll, bets = [], onClose, onDeleted }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const create = useCreateBankroll();
  const update = useUpdateBankroll();
  const del = useDeleteBankroll();

  const isCreate = !bankroll;
  const [name, setName] = useState("");
  const [capital, setCapital] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(bankroll?.name || "");
      setCapital(bankroll ? String(bankroll.capital) : "");
      setConfirmDelete(false);
    }
  }, [visible, bankroll]);

  const stats = bankroll ? computeStats(bets, parseFloat(capital.replace(",", ".")) || bankroll.capital) : null;
  const linkedCount = bets.length;
  const saving = create.isPending || update.isPending;

  const save = () => {
    const nameTrim = name.trim();
    if (!nameTrim) return toast.show("Nome obrigatório", "error");
    const capitalNum = parseFloat(capital.replace(",", ".")) || 0;
    if (capitalNum <= 0) return toast.show("Capital inválido", "error");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isCreate) {
      create.mutate(
        { name: nameTrim, capital: capitalNum },
        {
          onSuccess: () => {
            toast.show("Banca criada", "success");
            onClose();
          },
          onError: (e: any) => toast.show(e?.message || "Erro ao criar", "error"),
        }
      );
    } else {
      update.mutate(
        { id: bankroll!.id, name: nameTrim, capital: capitalNum },
        {
          onSuccess: () => {
            toast.show("Banca atualizada", "success");
            onClose();
          },
          onError: (e: any) => toast.show(e?.message || "Erro ao salvar", "error"),
        }
      );
    }
  };

  const doDelete = () => {
    if (!bankroll) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    del.mutate(bankroll.id, {
      onSuccess: () => {
        toast.show(`Banca excluída (${linkedCount} apostas)`, "error");
        onClose();
        onDeleted?.();
      },
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <KeyboardAwareScrollView bottomOffset={16} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{isCreate ? "Nova banca" : "Editar banca"}</Text>
              <Pressable onPress={onClose} style={styles.closeBtn} testID="bankroll-modal-close">
                <MaterialDesignIcons name="close" size={18} color={colors.muted} />
              </Pressable>
            </View>

            <Text style={styles.label}>Nome da banca</Text>
            <TextInput
              testID="bankroll-name-input"
              value={name}
              onChangeText={setName}
              placeholder="Ex: Girino"
              placeholderTextColor={colors.faint}
              style={styles.input}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Capital inicial (R$)</Text>
            <TextInput
              testID="bankroll-capital-input"
              value={capital}
              onChangeText={setCapital}
              placeholder="500"
              placeholderTextColor={colors.faint}
              keyboardType="numeric"
              style={styles.input}
            />

            {stats && (
              <View style={styles.summary}>
                <Text style={styles.summaryLabel}>Resumo</Text>
                <Text style={styles.summaryText}>
                  {stats.count} apostas • Lucro{" "}
                  <Text style={{ color: stats.lucro >= 0 ? colors.success : colors.error, fontWeight: "800" }}>
                    {signedBRL(stats.lucro)}
                  </Text>{" "}
                  • ROI {stats.roi.toFixed(1)}%
                </Text>
              </View>
            )}

            {!isCreate && !confirmDelete && (
              <View style={styles.actions}>
                <Pressable style={styles.deleteBtn} onPress={() => setConfirmDelete(true)} testID="bankroll-delete">
                  <MaterialDesignIcons name="trash-can-outline" size={18} color={colors.error} />
                  <Text style={styles.deleteText}>Excluir</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={save} disabled={saving} testID="bankroll-save">
                  <Text style={styles.saveText}>Salvar</Text>
                </Pressable>
              </View>
            )}

            {isCreate && (
              <Pressable style={[styles.saveBtn, { marginTop: 20 }]} onPress={save} disabled={saving} testID="bankroll-save">
                <Text style={styles.saveText}>Criar banca</Text>
              </Pressable>
            )}

            {confirmDelete && (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmTitle}>Tem certeza?</Text>
                <Text style={styles.confirmText}>
                  Isso apaga a banca "{bankroll?.name}" e {linkedCount} apostas. Não dá pra desfazer.
                </Text>
                <View style={styles.actions}>
                  <Pressable style={styles.cancelBtn} onPress={() => setConfirmDelete(false)}>
                    <Text style={styles.cancelText}>Cancelar</Text>
                  </Pressable>
                  <Pressable style={styles.confirmDeleteBtn} onPress={doDelete} testID="bankroll-delete-confirm">
                    <Text style={styles.saveText}>Excluir</Text>
                  </Pressable>
                </View>
              </View>
            )}
            <View style={{ height: insets.bottom }} />
          </KeyboardAwareScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center", padding: t.spacing.lg },
  card: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "85%",
    backgroundColor: t.colors.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.xl,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: t.spacing.lg },
  title: { color: t.colors.text, fontSize: 18, fontWeight: "800" },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: t.colors.cardAlt, alignItems: "center", justifyContent: "center" },
  label: { color: t.colors.muted, fontSize: 12, fontWeight: "600", marginBottom: t.spacing.sm },
  input: {
    height: 48,
    backgroundColor: t.colors.cardAlt,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.lg,
    color: t.colors.text,
    fontSize: 15,
  },
  summary: { backgroundColor: t.colors.cardAlt, borderRadius: t.radius.md, padding: t.spacing.md, marginTop: t.spacing.lg, borderWidth: 1, borderColor: t.colors.border },
  summaryLabel: { color: t.colors.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
  summaryText: { color: t.colors.textSecondary, fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: "row", gap: t.spacing.md, marginTop: t.spacing.xl },
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
  saveBtn: { flex: 1, height: 48, borderRadius: t.radius.md, backgroundColor: t.colors.brand, alignItems: "center", justifyContent: "center" },
  saveText: { color: t.colors.onBrand, fontSize: 14, fontWeight: "800" },
  confirmBox: { marginTop: t.spacing.lg, backgroundColor: "rgba(239,68,68,0.08)", borderWidth: 1, borderColor: "rgba(239,68,68,0.25)", borderRadius: t.radius.md, padding: t.spacing.lg },
  confirmTitle: { color: t.colors.error, fontSize: 16, fontWeight: "800", marginBottom: 6 },
  confirmText: { color: t.colors.textSecondary, fontSize: 13, lineHeight: 19 },
  cancelBtn: { flex: 1, height: 48, borderRadius: t.radius.md, backgroundColor: t.colors.cardAlt, alignItems: "center", justifyContent: "center" },
  cancelText: { color: t.colors.muted, fontSize: 14, fontWeight: "800" },
  confirmDeleteBtn: { flex: 1, height: 48, borderRadius: t.radius.md, backgroundColor: t.colors.error, alignItems: "center", justifyContent: "center" },
}));
