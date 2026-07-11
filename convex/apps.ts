// ============================================================
// Apps — Gestión de aplicaciones generadas
// ============================================================

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    category: v.string(),
    prompt: v.string(),
    sourceCode: v.string(),
    monetization: v.object({
      admob: v.boolean(),
      amazon: v.boolean(),
      freellm: v.boolean(),
      pwa: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const appId = await ctx.db.insert("apps", {
      userId: args.userId,
      name: args.name,
      description: args.description,
      category: args.category,
      prompt: args.prompt,
      sourceCode: args.sourceCode,
      status: "draft",
      monetization: args.monetization,
      views: 0,
      downloads: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return appId;
  },
});

export const publish = mutation({
  args: { appId: v.id("apps") },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.appId);
    if (!app) throw new Error("App no encontrada");

    await ctx.db.patch(args.appId, {
      status: "published",
      updatedAt: Date.now(),
    });

    // Registrar transacción de publicación (costo)
    await ctx.db.insert("transactions", {
      userId: app.userId,
      type: "credit_purchase",
      amount: -5, // 5 créditos por publicar
      currency: "EUR",
      status: "completed",
      description: `Publicación de "${app.name}"`,
      metadata: { appId: args.appId },
      createdAt: Date.now(),
    });

    return true;
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apps")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { appId: v.id("apps") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.appId);
  },
});

export const archive = mutation({
  args: { appId: v.id("apps") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.appId, {
      status: "archived",
      updatedAt: Date.now(),
    });
  },
});

// Todas las apps (admin)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("apps").order("desc").collect();
  },
});

// Incrementar visualización
export const recordView = internalMutation({
  args: { appId: v.id("apps") },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.appId);
    if (app) {
      await ctx.db.patch(args.appId, { views: app.views + 1 });
    }
  },
});