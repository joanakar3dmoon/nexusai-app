// ============================================================
// Auth — Backend de autenticación real
// ============================================================

import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Admin por defecto — se crea si no existe
const ADMIN_EMAIL = "joanlazaro83@gmail.com";
const ADMIN_NAME = "Joan (R3DMOON)";

// ==================== MUTATIONS ====================

// Login / registro automático
export const login = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      // Actualizar lastLogin
      await ctx.db.patch(existing._id, {
        lastLogin: Date.now(),
        name: args.name || existing.name,
      });
      return {
        id: existing._id,
        email: existing.email,
        role: existing.role,
        credits: existing.credits,
        balance: existing.balance,
        name: existing.name,
      };
    }

    // Nuevo usuario — ¿es admin?
    const isAdmin = args.email === ADMIN_EMAIL;

    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name || "",
      role: isAdmin ? "admin" : "user",
      credits: isAdmin ? 99999 : 10, // admin ilimitado, user 10 créditos gratis
      balance: 0,
      totalEarned: 0,
      createdAt: Date.now(),
      lastLogin: Date.now(),
    });

    return {
      id: userId,
      email: args.email,
      role: isAdmin ? "admin" : "user",
      credits: isAdmin ? 99999 : 10,
      balance: 0,
      name: args.name || "",
    };
  },
});

// ==================== QUERIES ====================

export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      id: user._id,
      email: user.email,
      role: user.role,
      credits: user.credits,
      balance: user.balance,
      totalEarned: user.totalEarned,
      name: user.name,
      paypalEmail: user.paypalEmail,
    };
  },
});

// Obtener todos los usuarios (solo admin)
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// ==================== INTERNAL ====================

// Descontar créditos (llamado desde apps.ts)
export const deductCredits = internalMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Usuario no encontrado");
    if (user.credits < args.amount) throw new Error("Créditos insuficientes");

    await ctx.db.patch(args.userId, {
      credits: user.credits - args.amount,
    });
  },
});
