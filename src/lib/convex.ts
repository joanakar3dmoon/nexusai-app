// ============================================================
// Cliente Convex para el frontend
// Conecta React con la base de datos real
// ============================================================

import { ConvexProvider, ConvexReactClient } from "convex/react";

// Se configura con la URL de despliegue de Convex
// PENDIENTE: reemplazar con la URL real tras `npx convex deploy`
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL || "";

let convexClient: ConvexReactClient | null = null;

if (CONVEX_URL) {
  convexClient = new ConvexReactClient(CONVEX_URL);
}

export { convexClient, CONVEX_URL };
export { ConvexProvider };