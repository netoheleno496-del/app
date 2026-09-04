import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
  FlatList,
} from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

import { makeStyles, useTheme } from "@/src/theme";
import CasaLogo from "@/src/components/CasaLogo";
import { useCasas, useBets, useCreateBet, useUpdateBet, useAddCasa } from "@/src/lib/queries";
import { useSelection } from "@/src/context/SelectionContext";
import { useToast } from "@/src/context/ToastContext";
import { ESTADOS, ESPORTES, FORMATOS, EstadoAposta, Formato, estadoColor } from "@/src/lib/bets";

const WEEK = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];

export default function AddBetScreen() {
  const styles = useStyles();
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedId } = useSelection();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const toast = useToast();

  const casas = useCasas();
  const betsQ = useBets(selectedId);
  const createBet = useCreateBet();
  const updateBet = useUpdateBet();
  const addCasa = useAddCasa();

  const editingBet = editId ? (betsQ.data || []).find((b) => b.id === editId) : null;

  const [data, setData] = useState<Date>(editingBet ? new Date(editingBet.data) : new Date());
  const [hora, setHora] = useState(
    editingBet
      ? editingBet.hora
      : `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`
  );
  const [casa, setCasa] = useState(editingBet?.casa || "");
  const [titulo, setTitulo] = useState(editingBet?.titulo || "");
  const [cotacao, setCotacao] = useState(editingBet ? String(editingBet.cotacao) : "");
  const [valor, setValor] = useState(editingBet ? String(editingBet.valor) : "");
  const [esporte, setEsporte] = useState(editingBet?.esporte || "Futebol");
  const [estado, setEstado] = useState<EstadoAposta>(editingBet?.estado || "Pendente");
  const [formato, setFormato] = useState<Formato>(editingBet?.formato || "Simples");

  const [showCasas, setShowCasas] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [casaSearch, setCasaSearch] = useState("");
  const [calView, setCalView] = useState(new Date(data));

  const saving = createBet.isPending || updateBet.isPending;

  const filteredCasas = useMemo(() => {
    const list = casas.data || [];
    if (!casaSearch) return list;
    return list.filter((c) => c.toLowerCase().includes(casaSearch.toLowerCase()));
  }, [casas.data, casaSearch]);

  const formatData = (d: Date) =>
    new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(d);

  const save = () => {
    if (!selectedId) {
      toast.show("Selecione uma banca primeiro", "error");
      return router.back();
    }
    const valorNum = parseFloat(valor.replace(",", ".")) || 0;
    if (!casa) return toast.show("Selecione a casa de apostas", "error");
    if (!titulo.trim()) return toast.show("Informe o título da aposta", "error");
    if (valorNum <= 0) return toast.show("Informe um valor válido", "error");
    const cotNum = parseFloat(cotacao.replace(",", ".")) || 1.5;

    const dt = new Date(data);
    const hm = hora.match(/^(\d{1,2}):(\d{1,2})$/);
    if (hm) dt.setHours(parseInt(hm[1]), parseInt(hm[2]), 0, 0);

    const payload = {
      casa,
      titulo: titulo.trim(),
      cotacao: cotNum,
      valor: valorNum,
      estado,
      data: dt.toISOString(),
      hora,
      esporte,
      formato,
      tipo: formato,
    };

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (editingBet) {
      updateBet.mutate(
        { id: editingBet.id, ...payload },
        {
          onSuccess: () => {
            toast.show("Aposta atualizada", "success");
            router.back();
          },
          onError: (e: any) => toast.show(e?.message || "Erro ao salvar", "error"),
        }
      );
    } else {
      createBet.mutate(
        { bankroll_id: selectedId, ...payload },
        {
          onSuccess: () => {
            toast.show("Aposta adicionada", "success");
            router.back();
          },
          onError: (e: any) => toast.show(e?.message || "Erro ao salvar", "error"),
        }
      );
    }
  };

  const addCustomCasa = () => {
    const name = casaSearch.trim();
    if (!name) return;
    addCasa.mutate(name, {
      onSuccess: () => {
        setCasa(name);
        setShowCasas(false);
        setCasaSearch("");
        toast.show(`Casa "${name}" adicionada`, "success");
      },
    });
  };

  const calendarCells = useMemo(() => {
    const year = calView.getFullYear();
    const month = calView.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const today = new Date();
    const same = (a: Date, b: Date) =>
      a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
    const cells = [];
    for (let i = 0; i < 42; i++) {
      let dayNum: number;
      let dateObj: Date;
      let isCurrent: boolean;
      if (i < firstDay) {
        dayNum = daysInPrev - firstDay + i + 1;
        dateObj = new Date(year, month - 1, dayNum);
        isCurrent = false;
      } else if (i >= firstDay + daysInMonth) {
        dayNum = i - (firstDay + daysInMonth) + 1;
        dateObj = new Date(year, month + 1, dayNum);
        isCurrent = false;
      } else {
        dayNum = i - firstDay + 1;
        dateObj = new Date(year, month, dayNum);
        isCurrent = true;
      }
      cells.push({ dayNum, dateObj, isCurrent, isToday: same(dateObj, today), isSelected: same(dateObj, data) });
    }
    return cells;
  }, [calView, data]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} testID="add-close">
          <MaterialDesignIcons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{editingBet ? "Editar aposta" : "Nova aposta"}</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.form}
        bottomOffset={90}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.row}>
          <View style={styles.flexField}>
            <Text style={styles.label}>Data</Text>
            <Pressable
              style={styles.selectBtn}
              onPress={() => {
                setCalView(new Date(data));
                setShowCalendar(true);
              }}
              testID="add-date"
            >
              <Text style={styles.selectText}>{formatData(data)}</Text>
              <MaterialDesignIcons name="calendar" size={18} color={colors.muted} />
            </Pressable>
          </View>
          <View style={styles.flexField}>
            <Text style={styles.label}>Hora</Text>
            <TextInput
              testID="add-hora"
              value={hora}
              onChangeText={(v) => setHora(v.replace(/[^0-9:]/g, "").slice(0, 5))}
              placeholder="14:00"
              placeholderTextColor={colors.faint}
              keyboardType="numbers-and-punctuation"
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Casa de apostas</Text>
          <Pressable style={styles.selectBtn} onPress={() => setShowCasas(true)} testID="add-casa">
            {casa ? (
              <View style={styles.casaChosen}>
                <CasaLogo name={casa} size={26} />
                <Text style={styles.selectText}>{casa}</Text>
              </View>
            ) : (
              <Text style={[styles.selectText, { color: colors.faint }]}>Selecionar casa</Text>
            )}
            <MaterialDesignIcons name="chevron-down" size={18} color={colors.muted} />
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Título da aposta</Text>
          <TextInput
            testID="add-titulo"
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Ex: Flamengo vence"
            placeholderTextColor={colors.faint}
            style={styles.input}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.flexField}>
            <Text style={styles.label}>Cotação</Text>
            <TextInput
              testID="add-cotacao"
              value={cotacao}
              onChangeText={(v) => setCotacao(v.replace(/[^0-9.,]/g, ""))}
              placeholder="1.90"
              placeholderTextColor={colors.faint}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>
          <View style={styles.flexField}>
            <Text style={styles.label}>Valor (R$)</Text>
            <TextInput
              testID="add-valor"
              value={valor}
              onChangeText={(v) => setValor(v.replace(/[^0-9.,]/g, ""))}
              placeholder="50"
              placeholderTextColor={colors.faint}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Esporte</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            {ESPORTES.map((e) => {
              const active = esporte === e.key;
              return (
                <Pressable
                  key={e.key}
                  testID={`esporte-${e.key}`}
                  onPress={() => setEsporte(e.key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <MaterialDesignIcons name={e.icon as any} size={15} color={active ? colors.onBrand : colors.muted} />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{e.key}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            {ESTADOS.map((st) => {
              const active = estado === st;
              const c = estadoColor(st);
              return (
                <Pressable
                  key={st}
                  testID={`estado-${st}`}
                  onPress={() => setEstado(st)}
                  style={[styles.chip, active && { backgroundColor: c, borderColor: c }]}
                >
                  <View style={[styles.chipDot, { backgroundColor: active ? colors.onDark : c }]} />
                  <Text style={[styles.chipText, active && { color: colors.onDark }]}>{st}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Formato da aposta</Text>
          <View style={styles.segment}>
            {FORMATOS.map((f) => {
              const active = formato === f.key;
              return (
                <Pressable
                  key={f.key}
                  testID={`formato-${f.key}`}
                  onPress={() => setFormato(f.key)}
                  style={[styles.segBtn, active && styles.segActive]}
                >
                  <Text style={[styles.segText, active && styles.segTextActive]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable onPress={save} disabled={saving} style={styles.saveBtn} testID="add-save">
            <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveGradient}>
              <Text style={styles.saveText}>{editingBet ? "Salvar alterações" : "Adicionar aposta"}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardStickyView>

      {/* Casas modal */}
      <Modal visible={showCasas} animationType="slide" onRequestClose={() => setShowCasas(false)}>
        <View style={[styles.casaModal, { paddingTop: insets.top }]}>
          <View style={styles.casaSearchRow}>
            <Pressable onPress={() => setShowCasas(false)} testID="casa-back">
              <MaterialDesignIcons name="chevron-left" size={28} color={colors.text} />
            </Pressable>
            <TextInput
              testID="casa-search"
              value={casaSearch}
              onChangeText={setCasaSearch}
              placeholder="Buscar ou adicionar casa"
              placeholderTextColor={colors.faint}
              autoFocus
              style={styles.casaSearchInput}
            />
          </View>
          <FlatList
            data={filteredCasas}
            keyExtractor={(i) => i}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              casaSearch.trim() && !filteredCasas.some((c) => c.toLowerCase() === casaSearch.trim().toLowerCase()) ? (
                <Pressable style={styles.addCasaRow} onPress={addCustomCasa} testID="casa-add">
                  <MaterialDesignIcons name="plus-circle" size={20} color={colors.brand} />
                  <Text style={styles.addCasaText}>Adicionar "{casaSearch.trim()}"</Text>
                </Pressable>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                testID={`casa-option-${item}`}
                style={styles.casaOption}
                onPress={() => {
                  setCasa(item);
                  setShowCasas(false);
                  setCasaSearch("");
                }}
              >
                <View style={styles.casaOptionLeft}>
                  <CasaLogo name={item} size={30} />
                  <Text style={styles.casaOptionText}>{item}</Text>
                </View>
                {casa === item && <MaterialDesignIcons name="check" size={20} color={colors.brand} />}
              </Pressable>
            )}
          />
        </View>
      </Modal>

      {/* Calendar modal */}
      <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={() => setShowCalendar(false)}>
        <Pressable style={styles.calBackdrop} onPress={() => setShowCalendar(false)}>
          <Pressable style={styles.calCard} onPress={() => {}}>
            <View style={styles.calHead}>
              <Pressable onPress={() => setCalView(new Date(calView.getFullYear(), calView.getMonth() - 1, 1))} style={styles.calNav}>
                <MaterialDesignIcons name="chevron-left" size={22} color={colors.text} />
              </Pressable>
              <Text style={styles.calMonth}>
                {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(calView)}
              </Text>
              <Pressable onPress={() => setCalView(new Date(calView.getFullYear(), calView.getMonth() + 1, 1))} style={styles.calNav}>
                <MaterialDesignIcons name="chevron-right" size={22} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.calWeekRow}>
              {WEEK.map((d) => (
                <Text key={d} style={styles.calWeekLabel}>{d}</Text>
              ))}
            </View>
            <View style={styles.calGrid}>
              {calendarCells.map((c, idx) => (
                <Pressable
                  key={idx}
                  style={[styles.calCell, c.isSelected && styles.calCellSelected, c.isToday && !c.isSelected && styles.calCellToday]}
                  onPress={() => {
                    setData(c.dateObj);
                    setShowCalendar(false);
                  }}
                >
                  <Text style={[styles.calCellText, !c.isCurrent && { color: colors.faint }, c.isSelected && { color: colors.onDark, fontWeight: "800" }]}>
                    {c.dayNum}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={styles.calToday}
              onPress={() => {
                const now = new Date();
                setData(now);
                setCalView(now);
                setShowCalendar(false);
              }}
            >
              <Text style={styles.calTodayText}>Hoje</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: t.spacing.md,
    paddingBottom: t.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: t.colors.text, fontSize: 17, fontWeight: "800" },
  form: { padding: t.spacing.lg, gap: t.spacing.lg },
  row: { flexDirection: "row", gap: t.spacing.md },
  field: { gap: t.spacing.sm },
  flexField: { flex: 1, gap: t.spacing.sm },
  label: { color: t.colors.muted, fontSize: 12, fontWeight: "600" },
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
  selectBtn: {
    height: 48,
    backgroundColor: t.colors.cardAlt,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: { color: t.colors.text, fontSize: 15 },
  casaChosen: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm },
  chipScroll: { gap: t.spacing.sm, paddingRight: t.spacing.md },
  chip: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.chip,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  chipActive: { backgroundColor: t.colors.brand, borderColor: t.colors.brand },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { color: t.colors.muted, fontSize: 13, fontWeight: "700" },
  chipTextActive: { color: t.colors.onBrand },
  segment: { flexDirection: "row", gap: t.spacing.sm },
  segBtn: {
    flex: 1,
    height: 42,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.chip,
    borderWidth: 1,
    borderColor: t.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  segActive: { backgroundColor: t.colors.purple, borderColor: t.colors.purple },
  segText: { color: t.colors.muted, fontSize: 13, fontWeight: "700" },
  segTextActive: { color: t.colors.onDark },
  footer: {
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.md,
    backgroundColor: t.colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: t.colors.divider,
  },
  saveBtn: { borderRadius: t.radius.md, overflow: "hidden" },
  saveGradient: { height: 52, alignItems: "center", justifyContent: "center" },
  saveText: { color: t.colors.onDark, fontSize: 16, fontWeight: "800" },
  // casas modal
  casaModal: { flex: 1, backgroundColor: t.colors.surface },
  casaSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  casaSearchInput: {
    flex: 1,
    height: 44,
    backgroundColor: t.colors.cardAlt,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.lg,
    color: t.colors.text,
    fontSize: 15,
  },
  addCasaRow: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm, padding: t.spacing.lg, backgroundColor: "rgba(46,191,175,0.08)" },
  addCasaText: { color: t.colors.brand, fontSize: 15, fontWeight: "700" },
  casaOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  casaOptionLeft: { flexDirection: "row", alignItems: "center", gap: t.spacing.md },
  casaOptionText: { color: t.colors.text, fontSize: 15 },
  // calendar
  calBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center", padding: t.spacing.lg },
  calCard: { width: "100%", maxWidth: 360, backgroundColor: t.colors.card, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.border, padding: t.spacing.lg },
  calHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: t.spacing.md },
  calNav: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.colors.cardAlt, alignItems: "center", justifyContent: "center" },
  calMonth: { color: t.colors.text, fontSize: 15, fontWeight: "800", textTransform: "capitalize" },
  calWeekRow: { flexDirection: "row", marginBottom: t.spacing.sm },
  calWeekLabel: { flex: 1, textAlign: "center", color: t.colors.dim, fontSize: 11, fontWeight: "700" },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: t.radius.pill },
  calCellSelected: { backgroundColor: t.colors.blue },
  calCellToday: { borderWidth: 1, borderColor: t.colors.blue },
  calCellText: { color: t.colors.text, fontSize: 14 },
  calToday: { marginTop: t.spacing.md, height: 44, borderRadius: t.radius.md, backgroundColor: t.colors.cardAlt, alignItems: "center", justifyContent: "center" },
  calTodayText: { color: t.colors.blue, fontSize: 14, fontWeight: "800" },
}));
