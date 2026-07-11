// ============================================================
// API Bridge — Conexiones entre frontend y Convex
// ============================================================

import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";

// ==================== USUARIOS ====================

export function useLogin() {
  return useMutation(api.users.login);
}

export function useUser(userId: string | undefined) {
  return useQuery(api.users.getUser, userId ? { userId: userId as any } : "skip");
}

// ==================== APPS ====================

export function useCreateApp() {
  return useMutation(api.apps.create);
}

export function usePublishApp() {
  return useMutation(api.apps.publish);
}

export function useUserApps(userId: string | undefined) {
  return useQuery(api.apps.listByUser, userId ? { userId: userId as any } : "skip");
}

export function useApp(appId: string | undefined) {
  return useQuery(api.apps.getById, appId ? { appId: appId as any } : "skip");
}

// ==================== FINANZAS ====================

export function useFinancialDashboard() {
  return useQuery(api.finance.getFinancialDashboard);
}

export function useInvestments(status?: string) {
  return useQuery(api.finance.getInvestments, status ? { status } : undefined);
}

export function useWithdrawals(status?: string) {
  return useQuery(api.finance.getWithdrawals, status ? { status } : undefined);
}

export function useProposeInvestment() {
  return useMutation(api.finance.proposeInvestment);
}

export function useApproveInvestment() {
  return useMutation(api.finance.approveInvestment);
}

export function useRequestWithdrawal() {
  return useMutation(api.finance.requestWithdrawal);
}

export function useProcessWithdrawal() {
  return useMutation(api.finance.processWithdrawal);
}

export function useAnalyzeMarket() {
  return useMutation(api.finance.analyzeMarket);
}

export function useRevenueReport(days?: number) {
  return useQuery(api.finance.getRevenueReport, { days: days || 30 });
}