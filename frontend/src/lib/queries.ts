import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/api/client";
import { Aposta, Bankroll } from "@/src/lib/bets";

export function useBankrolls(enabled = true) {
  return useQuery({
    queryKey: ["bankrolls"],
    queryFn: () => api<Bankroll[]>("/bankrolls"),
    enabled,
  });
}

export function useBets(bankrollId: string | null) {
  return useQuery({
    queryKey: ["bets", bankrollId],
    queryFn: () => api<Aposta[]>(`/bets?bankroll_id=${bankrollId}`),
    enabled: !!bankrollId,
  });
}

export function useAllBets() {
  return useQuery({
    queryKey: ["bets", "all"],
    queryFn: () => api<Aposta[]>("/bets"),
  });
}

export function useCasas(enabled = true) {
  return useQuery({
    queryKey: ["casas"],
    queryFn: () => api<string[]>("/casas"),
    enabled,
  });
}

export function useCreateBankroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; capital: number }) =>
      api<Bankroll>("/bankrolls", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bankrolls"] }),
  });
}

export function useUpdateBankroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name: string; capital: number }) =>
      api<Bankroll>(`/bankrolls/${id}`, { method: "PUT", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bankrolls"] }),
  });
}

export function useDeleteBankroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/bankrolls/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bankrolls"] });
      qc.invalidateQueries({ queryKey: ["bets"] });
    },
  });
}

export function useCreateBet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Aposta> & { bankroll_id: string }) =>
      api<Aposta>("/bets", { method: "POST", body }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["bets", v.bankroll_id] });
      qc.invalidateQueries({ queryKey: ["bankrolls"] });
    },
  });
}

export function useUpdateBet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Aposta> & { id: string }) =>
      api<Aposta>(`/bets/${id}`, { method: "PUT", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bets"] });
      qc.invalidateQueries({ queryKey: ["bankrolls"] });
    },
  });
}

export function useDeleteBet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/bets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bets"] });
      qc.invalidateQueries({ queryKey: ["bankrolls"] });
    },
  });
}

export function useAddCasa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api<string[]>("/casas", { method: "POST", body: { name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["casas"] }),
  });
}
