import { colors } from "@/src/theme";

export type EstadoAposta =
  | "Pendente"
  | "Ganha"
  | "Perdida"
  | "Reembolsada"
  | "Meio ganho"
  | "Meio perdido"
  | "Cashout"
  | "Cancelado";

export type Formato = "Simples" | "Back" | "Lay";

export interface Bankroll {
  id: string;
  name: string;
  capital: number;
  created_at?: string;
}

export interface Aposta {
  id: string;
  bankroll_id: string;
  casa: string;
  titulo: string;
  cotacao: number;
  valor: number;
  estado: EstadoAposta;
  data: string;
  hora: string;
  esporte: string;
  formato: Formato;
  tipo: string;
}

export const ESTADOS: EstadoAposta[] = [
  "Pendente",
  "Ganha",
  "Perdida",
  "Reembolsada",
  "Meio ganho",
  "Meio perdido",
  "Cashout",
  "Cancelado",
];

export const FORMATOS: { key: Formato; label: string }[] = [
  { key: "Simples", label: "Simples" },
  { key: "Back", label: "A favor (Back)" },
  { key: "Lay", label: "Contra (Lay)" },
];

export const ESPORTES: { key: string; icon: string }[] = [
  { key: "Futebol", icon: "soccer" },
  { key: "Basquete", icon: "basketball" },
  { key: "Tênis", icon: "tennis" },
  { key: "Vôlei", icon: "volleyball" },
  { key: "E-Sports", icon: "controller" },
  { key: "MMA/UFC", icon: "mixed-martial-arts" },
  { key: "Beisebol", icon: "baseball" },
  { key: "Hóquei", icon: "hockey-puck" },
  { key: "Fórmula 1", icon: "car-sports" },
  { key: "Outro", icon: "trophy" },
];

export function esporteIcon(esporte: string): string {
  return ESPORTES.find((e) => e.key === esporte)?.icon || "trophy";
}

export function estadoColor(estado: EstadoAposta): string {
  switch (estado) {
    case "Ganha":
      return colors.success;
    case "Perdida":
      return colors.error;
    case "Pendente":
      return colors.pending;
    case "Meio ganho":
      return colors.brand;
    case "Meio perdido":
      return colors.warning;
    case "Cashout":
      return colors.info;
    case "Reembolsada":
      return colors.purple;
    default:
      return colors.dim;
  }
}

export function calcLucro(a: Aposta): number {
  if (a.estado === "Pendente") return 0;
  if (a.estado === "Ganha") return a.valor * (a.cotacao - 1);
  if (a.estado === "Perdida") return -a.valor;
  if (a.estado === "Meio ganho") return (a.valor * (a.cotacao - 1)) / 2;
  if (a.estado === "Meio perdido") return -a.valor / 2;
  return 0; // Reembolsada, Cashout, Cancelado -> neutro
}

const FINALIZADAS: EstadoAposta[] = ["Ganha", "Perdida", "Meio ganho", "Meio perdido"];
export function isFinalizada(e: EstadoAposta): boolean {
  return FINALIZADAS.includes(e);
}

export function formatBRL(n: number): string {
  const s = Math.abs(n).toFixed(2).replace(".", ",");
  return `${n < 0 ? "-" : ""}R$ ${s}`;
}

export function signedBRL(n: number): string {
  const s = Math.abs(n).toFixed(2).replace(".", ",");
  return `${n > 0 ? "+" : n < 0 ? "-" : ""}R$ ${s}`;
}

export interface BankStats {
  count: number;
  pendentes: number;
  lucro: number;
  totalApostado: number;
  roi: number;
  prog: number;
}

export function computeStats(bets: Aposta[], capital: number): BankStats {
  const finalizadas = bets.filter((b) => isFinalizada(b.estado));
  const pendentes = bets.filter((b) => b.estado === "Pendente").length;
  const lucro = bets.reduce((s, a) => s + calcLucro(a), 0);
  const totalApostado = finalizadas.reduce((s, a) => s + a.valor, 0);
  const roi = totalApostado > 0 ? (lucro / totalApostado) * 100 : 0;
  const prog = capital > 0 ? (lucro / capital) * 100 : 0;
  return { count: bets.length, pendentes, lucro, totalApostado, roi, prog };
}

export type Timeframe = "1d" | "1s" | "1m" | "1a";

export function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

export function filterByPeriod(bets: Aposta[], tf: Timeframe): Aposta[] {
  const today = startOfDay(new Date());
  if (tf === "1a") return bets;
  if (tf === "1d") {
    return bets.filter((a) => startOfDay(new Date(a.data)).getTime() === today.getTime());
  }
  if (tf === "1s") {
    const hoje = new Date(today);
    const day = hoje.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() + diff);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
    fim.setHours(23, 59, 59, 999);
    return bets.filter((a) => {
      const t = new Date(a.data).getTime();
      return t >= inicio.getTime() && t <= fim.getTime();
    });
  }
  // 1m
  return bets.filter((a) => {
    const d = new Date(a.data);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });
}

export interface DayGroup {
  key: string;
  label: string;
  total: number;
  dt: Date;
  apostas: Aposta[];
}
export interface MonthGroup {
  key: string;
  label: string;
  total: number;
  days: DayGroup[];
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function groupByMonthDay(bets: Aposta[]): MonthGroup[] {
  const sorted = [...bets].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
  );
  const months: Record<string, MonthGroup> = {};
  sorted.forEach((a) => {
    const dt = new Date(a.data);
    const mKey = `${dt.getFullYear()}-${dt.getMonth()}`;
    if (!months[mKey]) {
      months[mKey] = {
        key: mKey,
        label: cap(dt.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })),
        total: 0,
        days: [],
      };
    }
    const m = months[mKey];
    m.total += calcLucro(a);
    const dKey = dt.toDateString();
    let day = m.days.find((d) => d.key === dKey);
    if (!day) {
      day = {
        key: dKey,
        label: cap(dt.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit" })),
        total: 0,
        dt,
        apostas: [],
      };
      m.days.push(day);
    }
    day.total += calcLucro(a);
    day.apostas.push(a);
  });
  return Object.values(months);
}
