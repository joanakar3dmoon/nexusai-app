// ============================================================
// NEXUSAI API CLIENT — Conexión real al backend FastAPI
// Todas las funciones son reales, persisten en SQLite/PostgreSQL
// ============================================================

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

// ============================================================
// AUTH / USERS
// ============================================================

export const api = {
  // Login
  login: (email: string, name?: string) =>
    apiFetch("/api/users/login", {
      method: "POST",
      body: JSON.stringify({ email, name }),
    }),

  getUser: (userId: string) => apiFetch(`/api/users/${userId}`),

  listUsers: () => apiFetch("/api/users/"),

  // ============================================================
  // APPS
  // ============================================================

  createApp: (data: {
    user_id: string;
    name: string;
    description: string;
    category: string;
    prompt: string;
    source_code: string;
    monetization: Record<string, any>;
  }) =>
    apiFetch("/api/apps/create", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  publishApp: (app_id: string) =>
    apiFetch("/api/apps/publish", {
      method: "POST",
      body: JSON.stringify({ app_id }),
    }),

  updateApp: (data: {
    app_id: string;
    source_code?: string;
    name?: string;
    status?: string;
  }) =>
    apiFetch("/api/apps/update", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getUserApps: (userId: string) => apiFetch(`/api/apps/user/${userId}`),

  getAllApps: () => apiFetch("/api/apps/all"),

  getApp: (appId: string) => apiFetch(`/api/apps/${appId}`),

  recordView: (appId: string) =>
    apiFetch(`/api/apps/${appId}/view`, { method: "POST" }),

  // ============================================================
  // FINANCE (solo admin)
  // ============================================================

  getFinancialDashboard: (userId: string) =>
    apiFetch(`/api/finance/dashboard/${userId}`),

  analyzeMarket: (userId: string) =>
    apiFetch(`/api/finance/analyze-market/${userId}`, { method: "POST" }),

  proposeInvestment: (data: {
    user_id: string;
    name: string;
    asset_type: string;
    ticker: string;
    amount: number;
    confidence: number;
    strategy: string;
    analysis_log: string;
  }) =>
    apiFetch("/api/finance/propose", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getInvestments: (userId: string, status?: string) =>
    apiFetch(`/api/finance/investments/${userId}${status ? `?status=${status}` : ""}`),

  requestWithdrawal: (userId: string, amount: number, paypal_email: string) =>
    apiFetch("/api/finance/request-withdrawal", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, amount, paypal_email }),
    }),

  processWithdrawal: (withdrawalId: string, action: "approve" | "reject") =>
    apiFetch(`/api/finance/process-withdrawal/${withdrawalId}?action=${action}`, {
      method: "POST",
    }),

  getWithdrawals: (userId: string, status?: string) =>
    apiFetch(`/api/finance/withdrawals/${userId}${status ? `?status=${status}` : ""}`),

  getRevenueReport: (userId: string, days: number = 30) =>
    apiFetch(`/api/finance/revenue-report/${userId}?days=${days}`),

  recordRevenue: (appId: string, amount: number, source: string) =>
    apiFetch(
      `/api/finance/record-revenue?app_id=${appId}&amount=${amount}&source=${source}`,
      { method: "POST" }
    ),

  simulateROI: () =>
    apiFetch("/api/finance/simulate-roi", { method: "POST" }),

  // ============================================================
  // PAYMENTS — Plan Premium / PayPal
  // ============================================================
  activatePlan: (userId: string, plan: string, subscriptionId?: string) =>
    apiFetch("/api/payments/activate", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, plan, months: 1, paypal_subscription_id: subscriptionId || "" }),
    }),

  planStatus: (userId: string) =>
    apiFetch(`/api/payments/status/${userId}`),

};


export default api;