// ============================================================
// CONVEX SCHEMA — NexusAI Database
// ============================================================

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema(
  {
    // ==================== USUARIOS ====================
    users: defineTable({
      email: v.string(),
      name: v.optional(v.string()),
      role: v.union(v.literal("admin"), v.literal("user")), // admin = Joan
      credits: v.number(), // créditos para generar apps
      balance: v.number(), // saldo acumulado en € (ingresos)
      totalEarned: v.number(), // histórico total ganado
      createdAt: v.number(), // timestamp
      lastLogin: v.number(),
      stripeCustomerId: v.optional(v.string()),
      paypalEmail: v.optional(v.string()), // para retiros
    })
      .index("by_email", ["email"])
      .index("by_role", ["role"]),

    // ==================== APPS GENERADAS ====================
    apps: defineTable({
      userId: v.id("users"),
      name: v.string(),
      description: v.string(),
      category: v.string(),
      prompt: v.string(), // prompt original
      sourceCode: v.string(), // HTML generado
      status: v.union(
        v.literal("draft"),      // en construcción
        v.literal("published"),  // publicada
        v.literal("archived"),   // archivada
      ),
      monetization: v.object({
        admob: v.boolean(),
        amazon: v.boolean(),
        freellm: v.boolean(),
        pwa: v.boolean(),
      }),
      previewUrl: v.optional(v.string()),
      apkUrl: v.optional(v.string()),
      views: v.number(),
      downloads: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_status", ["status"])
      .index("by_user_status", ["userId", "status"]),

    // ==================== TRANSACCIONES FINANCIERAS ====================
    transactions: defineTable({
      userId: v.id("users"),
      type: v.union(
        v.literal("credit_purchase"),     // compra de créditos
        v.literal("ad_revenue"),           // ingresos AdMob
        v.literal("affiliate_commission"), // comisiones Amazon
        v.literal("investment_return"),    // retorno de inversión
        v.literal("withdrawal"),           // retiro a PayPal/bank
        v.literal("admin_deposit"),        // depósito admin
      ),
      amount: v.number(),  // en € (positivo = ingreso, negativo = gasto)
      currency: v.string(), // "EUR"
      status: v.union(
        v.literal("pending"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("cancelled"),
      ),
      description: v.string(),
      metadata: v.optional(v.any()), // datos extra (appId, orderId, etc.)
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_type", ["type"])
      .index("by_status", ["status"])
      .index("by_user_type", ["userId", "type"]),

    // ==================== INVERSIONES (solo admin) ====================
    investments: defineTable({
      type: v.union(
        v.literal("crypto"),
        v.literal("stocks"),
        v.literal("real_estate"),
        v.literal("business"),
        v.literal("defi"),
        v.literal("other"),
      ),
      amount: v.number(),       // cantidad invertida en €
      currentValue: v.number(), // valor actual (se actualiza)
      roi: v.number(),          // Return On Investment en % (negativo = pérdida)
      status: v.union(
        v.literal("proposed"),   // el superagente lo propone
        v.literal("approved"),   // admin lo aprueba con %
        v.literal("active"),     // invertido y corriendo
        v.literal("completed"),  // finalizado con ganancias
        v.literal("lost"),       // pérdida total
      ),
      proposal: v.object({
        title: v.string(),
        summary: v.string(),
        risk: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
        expectedRoi: v.number(),
        confidence: v.number(), // 0-100
        source: v.string(),     // de dónde sacó la info
      }),
      adminApproval: v.object({
        percentage: v.number(), // % de revenue a usar (admin decide)
        approvedAt: v.optional(v.number()),
        approvedAmount: v.optional(v.number()),
      }),
      executedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("by_status", ["status"])
      .index("by_type", ["type"]),

    // ==================== RETIROS ====================
    withdrawals: defineTable({
      userId: v.id("users"),
      amount: v.number(),       // € a retirar
      method: v.union(
        v.literal("paypal"),
        v.literal("bank_transfer"),
        v.literal("debit_card"),
      ),
      accountDetails: v.object({
        paypalEmail: v.optional(v.string()),
        bankName: v.optional(v.string()),
        accountNumber: v.optional(v.string()),
        iban: v.optional(v.string()),
        cardNumber: v.optional(v.string()),
      }),
      status: v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("rejected"),
      ),
      fee: v.number(),       // comisión de retiro
      netAmount: v.number(), // cantidad neta a recibir
      processedAt: v.optional(v.number()),
      notes: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_status", ["status"]),

    // ==================== INGRESOS PUBLICITARIOS ====================
    adRevenue: defineTable({
      appId: v.id("apps"),
      date: v.string(),       // "2026-07-11"
      source: v.union(
        v.literal("admob_banner"),
        v.literal("admob_interstitial"),
        v.literal("admob_rewarded"),
        v.literal("amazon_affiliate"),
      ),
      impressions: v.number(),
      clicks: v.number(),
      revenue: v.number(),    // en €
      ecpm: v.number(),       // revenue por 1000 impresiones
      createdAt: v.number(),
    })
      .index("by_app", ["appId"])
      .index("by_date", ["date"])
      .index("by_source", ["source"])
      .index("by_app_date", ["appId", "date"]),

    // ==================== CONFIGURACIÓN (admin only) ====================
    settings: defineTable({
      key: v.string(),
      value: v.any(),
      description: v.optional(v.string()),
      updatedAt: v.number(),
    })
      .index("by_key", ["key"]),
  },
  { schemaValidation: true },
);