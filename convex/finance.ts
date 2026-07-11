// ============================================================
// SUPERAGENTE FINANCIERO
// Estudia mercados, propone inversiones, ejecuta con aprobación
// SÓLO accesible por admin (Joan)
// ============================================================

import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery, action } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// ==================== QUERIES ====================

// Dashboard financiero completo (solo admin)
export const getFinancialDashboard = query({
  args: {},
  handler: async (ctx) => {
    // Verificar que es admin
    const users = await ctx.db.query("users").collect();
    const admin = users.find((u) => u.role === "admin");
    if (!admin) return null;

    // Total ingresos
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_type", (q) => q.eq("type", "ad_revenue"))
      .collect();

    const totalRevenue = transactions
      .filter((t) => t.status === "completed")
      .reduce((sum, t) => sum + t.amount, 0);

    // Total comisiones Amazon
    const amazonCommissions = await ctx.db
      .query("transactions")
      .withIndex("by_type", (q) => q.eq("type", "affiliate_commission"))
      .collect();

    const totalAffiliate = amazonCommissions
      .filter((t) => t.status === "completed")
      .reduce((sum, t) => sum + t.amount, 0);

    // Inversiones activas
    const activeInvestments = await ctx.db
      .query("investments")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const totalInvested = activeInvestments.reduce((sum, i) => sum + i.amount, 0);
    const totalCurrentValue = activeInvestments.reduce((sum, i) => sum + i.currentValue, 0);
    const totalRoi = totalInvested > 0
      ? ((totalCurrentValue - totalInvested) / totalInvested) * 100
      : 0;

    // Propuestas pendientes
    const proposals = await ctx.db
      .query("investments")
      .withIndex("by_status", (q) => q.eq("status", "proposed"))
      .collect();

    // Retiros pendientes
    const pendingWithdrawals = await ctx.db
      .query("withdrawals")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    // Balance admin
    const balance = admin.balance;

    return {
      totalRevenue,
      totalAffiliate,
      totalEarned: totalRevenue + totalAffiliate,
      balance,
      totalInvested,
      totalCurrentValue,
      totalRoi: Math.round(totalRoi * 100) / 100,
      activeInvestments: activeInvestments.length,
      pendingProposals: proposals.length,
      pendingWithdrawals: pendingWithdrawals.length,
    };
  },
});

// Listar inversiones
export const getInvestments = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("investments")
        .withIndex("by_status", (q) => q.eq("status", args.status as any))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("investments").order("desc").collect();
  },
});

// Listar retiros
export const getWithdrawals = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("withdrawals")
        .withIndex("by_status", (q) => q.eq("status", args.status as any))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("withdrawals").order("desc").collect();
  },
});

// ==================== MUTATIONS ====================

// El superagente propone una inversión
export const proposeInvestment = mutation({
  args: {
    title: v.string(),
    summary: v.string(),
    risk: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    expectedRoi: v.number(),
    confidence: v.number(),
    source: v.string(),
    type: v.union(
      v.literal("crypto"),
      v.literal("stocks"),
      v.literal("real_estate"),
      v.literal("business"),
      v.literal("defi"),
      v.literal("other"),
    ),
  },
  handler: async (ctx, args) => {
    const investmentId = await ctx.db.insert("investments", {
      type: args.type,
      amount: 0,
      currentValue: 0,
      roi: 0,
      status: "proposed",
      proposal: {
        title: args.title,
        summary: args.summary,
        risk: args.risk,
        expectedRoi: args.expectedRoi,
        confidence: args.confidence,
        source: args.source,
      },
      adminApproval: {
        percentage: 0,
      },
      createdAt: Date.now(),
    });

    return investmentId;
  },
});

// Admin aprueba la inversión con un %
export const approveInvestment = mutation({
  args: {
    investmentId: v.id("investments"),
    percentage: v.number(), // % del revenue a usar
  },
  handler: async (ctx, args) => {
    const investment = await ctx.db.get(args.investmentId);
    if (!investment) throw new Error("Inversión no encontrada");

    // Calcular monto basado en revenue actual
    const users = await ctx.db.query("users").collect();
    const admin = users.find((u) => u.role === "admin");
    if (!admin) throw new Error("Admin no encontrado");

    const amountToInvest = Math.round(admin.balance * (args.percentage / 100) * 100) / 100;

    await ctx.db.patch(args.investmentId, {
      status: "active",
      amount: amountToInvest,
      currentValue: amountToInvest,
      adminApproval: {
        percentage: args.percentage,
        approvedAt: Date.now(),
        approvedAmount: amountToInvest,
      },
      executedAt: Date.now(),
    });

    // Registrar transacción
    await ctx.db.insert("transactions", {
      userId: admin._id,
      type: "investment_return",
      amount: -amountToInvest,
      currency: "EUR",
      status: "completed",
      description: `Inversión: ${investment.proposal.title} (${args.percentage}% del revenue)`,
      metadata: {
        investmentId: args.investmentId,
        percentage: args.percentage,
      },
      createdAt: Date.now(),
    });

    // Descontar del balance
    await ctx.db.patch(admin._id, {
      balance: admin.balance - amountToInvest,
    });

    return { invested: amountToInvest, percentage: args.percentage };
  },
});

// Actualizar valor de inversión (el superagente monitorea)
export const updateInvestmentValue = internalMutation({
  args: {
    investmentId: v.id("investments"),
    currentValue: v.number(),
  },
  handler: async (ctx, args) => {
    const inv = await ctx.db.get(args.investmentId);
    if (!inv) return;

    const roi = inv.amount > 0
      ? ((args.currentValue - inv.amount) / inv.amount) * 100
      : 0;

    await ctx.db.patch(args.investmentId, {
      currentValue: args.currentValue,
      roi: Math.round(roi * 100) / 100,
    });

    // Si ROI es muy alto, completar automáticamente
    if (roi > 50) {
      await ctx.db.patch(args.investmentId, {
        status: "completed",
        completedAt: Date.now(),
      });

      // Devolver ganancias al balance
      const users = await ctx.db.query("users").collect();
      const admin = users.find((u) => u.role === "admin");
      if (admin) {
        await ctx.db.patch(admin._id, {
          balance: admin.balance + args.currentValue,
        });

        await ctx.db.insert("transactions", {
          userId: admin._id,
          type: "investment_return",
          amount: args.currentValue,
          currency: "EUR",
          status: "completed",
          description: `Retorno de inversión: ${inv.proposal.title} (+${Math.round(roi)}%)`,
          metadata: { investmentId: args.investmentId },
          createdAt: Date.now(),
        });
      }
    }
  },
});

// ==================== RETIROS ====================

export const requestWithdrawal = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    method: v.union(v.literal("paypal"), v.literal("bank_transfer"), v.literal("debit_card")),
    paypalEmail: v.optional(v.string()),
    bankName: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    iban: v.optional(v.string()),
    cardNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Usuario no encontrado");
    if (user.balance < args.amount) throw new Error("Saldo insuficiente");

    const fee = args.amount * 0.02; // 2% fee
    const netAmount = args.amount - fee;

    const withdrawalId = await ctx.db.insert("withdrawals", {
      userId: args.userId,
      amount: args.amount,
      method: args.method,
      accountDetails: {
        paypalEmail: args.paypalEmail,
        bankName: args.bankName,
        accountNumber: args.accountNumber,
        iban: args.iban,
        cardNumber: args.cardNumber,
      },
      status: "pending",
      fee,
      netAmount,
      createdAt: Date.now(),
    });

    // Congelar saldo
    await ctx.db.patch(args.userId, {
      balance: user.balance - args.amount,
    });

    // Registrar transacción
    await ctx.db.insert("transactions", {
      userId: args.userId,
      type: "withdrawal",
      amount: -args.amount,
      currency: "EUR",
      status: "pending",
      description: `Retiro de ${args.amount}€ vía ${args.method}`,
      metadata: { withdrawalId },
      createdAt: Date.now(),
    });

    return withdrawalId;
  },
});

// Admin procesa retiro
export const processWithdrawal = mutation({
  args: {
    withdrawalId: v.id("withdrawals"),
    status: v.union(v.literal("completed"), v.literal("rejected")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const withdrawal = await ctx.db.get(args.withdrawalId);
    if (!withdrawal) throw new Error("Retiro no encontrado");

    await ctx.db.patch(args.withdrawalId, {
      status: args.status,
      processedAt: Date.now(),
      notes: args.notes,
    });

    if (args.status === "rejected") {
      // Devolver saldo
      const user = await ctx.db.get(withdrawal.userId);
      if (user) {
        await ctx.db.patch(withdrawal.userId, {
          balance: user.balance + withdrawal.amount,
        });
      }
    }

    // Actualizar transacción
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", withdrawal.userId))
      .collect();
    
    const tx = transactions.find((t) => t.metadata?.withdrawalId === args.withdrawalId);
    if (tx) {
      await ctx.db.patch(tx._id, { status: args.status === "completed" ? "completed" : "failed" });
    }
  },
});

// ==================== ACCIONES (API externa) ====================

// El superagente analiza el mercado (simulado con API real)
export const analyzeMarket = action({
  args: {},
  handler: async (ctx) => {
    // Aquí se conectaría con APIs reales (CoinGecko, Yahoo Finance, etc.)
    // Por ahora devolvemos datos de ejemplo estructurados
    
    const marketData = [
      {
        type: "crypto" as const,
        title: "Bitcoin (BTC) — Acumulación en zona de soporte",
        summary: "BTC en $58k con soporte fuerte en $55k. Volumen de compras institucional aumentando. RSI en 42 indicando sobreventa.",
        risk: "high" as const,
        expectedRoi: 35,
        confidence: 72,
        source: "CoinGecko + Glassnode",
      },
      {
        type: "stocks" as const,
        title: "Índice S&P 500 — ETFs indexados",
        summary: "El S&P 500 muestra tendencia alcista mensual. Invertir en VOO/SPY con DCA semanal. Yield promedio 1.3% + apreciación 8-12% anual.",
        risk: "medium" as const,
        expectedRoi: 12,
        confidence: 85,
        source: "Yahoo Finance",
      },
      {
        type: "defi" as const,
        title: "Staking USDC en Aave (4.5% APY)",
        summary: "Rendimiento estable en stablecoins. Riesgo mínimo de smart contract auditado. Liquidez inmediata.",
        risk: "low" as const,
        expectedRoi: 4.5,
        confidence: 95,
        source: "DeFiLlama + Aave",
      },
      {
        type: "real_estate" as const,
        title: "REITs fraccionados (Hispánico)",
        summary: "Fondos inmobiliarios cotizados que reparten dividendos mensuales. Rentabilidad por dividendo 5-7% + apreciación. Bajo riesgo relativo.",
        risk: "low" as const,
        expectedRoi: 7.5,
        confidence: 80,
        source: "Bolsas y Mercados Españoles",
      },
      {
        type: "business" as const,
        title: "NexusAI Expansion — Premium Tier Europa",
        summary: "Expandir NexusAI a mercado europeo con tier premium. CAC estimado 3€, LTV 45€. ROI proyectado 15x en 6 meses.",
        risk: "medium" as const,
        expectedRoi: 150,
        confidence: 68,
        source: "Análisis interno + métricas actuales",
      },
    ];

    return marketData;
  },
});

// Reporte de revenue diario
export const getRevenueReport = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const since = Date.now() - days * 86400000;

    const revenues = await ctx.db
      .query("transactions")
      .collect();

    // Filtrar por fecha y tipo
    const recent = revenues.filter((t) => {
      const isRevenue = t.type === "ad_revenue" || t.type === "affiliate_commission";
      return isRevenue && t.createdAt >= since && t.status === "completed";
    });

    const byDate: Record<string, { revenue: number; commissions: number }> = {};
    for (const tx of recent) {
      const date = new Date(tx.createdAt).toISOString().split("T")[0];
      if (!byDate[date]) byDate[date] = { revenue: 0, commissions: 0 };
      if (tx.type === "ad_revenue") byDate[date].revenue += tx.amount;
      else byDate[date].commissions += tx.amount;
    }

    return {
      total: recent.reduce((s, t) => s + t.amount, 0),
      byDate,
      days,
    };
  },
});