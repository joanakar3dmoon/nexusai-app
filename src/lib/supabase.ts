// Supabase client NexusAI
import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://tolzqxflecqbjdefohom.supabase.co";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbHpxeGZsZWNxYmpkZWZvaG9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMDgwNzAsImV4cCI6MjA5OTY4NDA3MH0.pg6NFFywnGz_IrA4S2O7FkcpbSyC9TTd9RVpH1E7gBc";
const SUPABASE_SECRET = import.meta.env.VITE_SUPABASE_SECRET_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbHpxeGZsZWNxYmpkZWZvaG9tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDEwODA3MCwiZXhwIjoyMDk5Njg0MDcwfQ.FaTcZpS4tVKJl8rIP-Vfv0nMub2bnNJNFFo9t1w7JfU";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET);
export interface DBUser { id:string;email:string;name:string;role:"user"|"admin";credits:number;balance:number;banned:boolean;created_at?:string; }
export interface DBApp { id:string;user_id:string;user_email:string;name:string;description:string;html_code:string;created_at?:string; }
export interface DBWithdrawal { id:string;user_id:string;user_email:string;amount:number;status:"pending"|"approved"|"rejected";note:string;created_at?:string; }
export async function dbGetUsers():Promise<DBUser[]>{const{data,error}=await supabaseAdmin.from("users").select("*").order("created_at",{ascending:false});if(error)console.error("[SB]",error.message);return data||[];}
export async function dbGetUserByEmail(e:string):Promise<DBUser|null>{const{data}=await supabaseAdmin.from("users").select("*").eq("email",e).maybeSingle();return data||null;}
export async function dbUpsertUser(u:Partial<DBUser>&{id:string}):Promise<DBUser|null>{const{data}=await supabaseAdmin.from("users").upsert(u,{onConflict:"id"}).select().maybeSingle();return data||null;}
export async function dbUpdateUser(id:string,up:Partial<DBUser>):Promise<boolean>{const{error}=await supabaseAdmin.from("users").update(up).eq("id",id);if(error)console.error("[SB]",error.message);return!error;}
export async function dbGetApps():Promise<DBApp[]>{const{data,error}=await supabaseAdmin.from("apps").select("*").order("created_at",{ascending:false});if(error)console.error("[SB]",error.message);return data||[];}
export async function dbSaveApp(app:Omit<DBApp,"created_at">):Promise<DBApp|null>{const{data,error}=await supabaseAdmin.from("apps").insert(app).select().maybeSingle();if(error)console.error("[SB] dbSaveApp:",error.message);return data||null;}
export async function dbDeleteApp(id:string):Promise<boolean>{const{error}=await supabaseAdmin.from("apps").delete().eq("id",id);return!error;}
export async function dbGetWithdrawals():Promise<DBWithdrawal[]>{const{data,error}=await supabaseAdmin.from("withdrawals").select("*").order("created_at",{ascending:false});if(error)console.error("[SB]",error.message);return data||[];}
export async function dbSaveWithdrawal(w:Omit<DBWithdrawal,"created_at">):Promise<DBWithdrawal|null>{const{data,error}=await supabaseAdmin.from("withdrawals").insert(w).select().maybeSingle();if(error)console.error("[SB] dbSaveWithdrawal:",error.message);return data||null;}
export async function dbUpdateWithdrawal(id:string,up:Partial<DBWithdrawal>):Promise<boolean>{const{error}=await supabaseAdmin.from("withdrawals").update(up).eq("id",id);return!error;}

export interface DBSubscription { id:string;user_id:string;user_email:string;plan:string;amount:number;status:"active"|"cancelled"|"pending";paypal_ref?:string;created_at?:string; }
export interface DBRevenue { id:string;source:"admob"|"amazon"|"subscription";amount:number;note?:string;created_at?:string; }
export async function dbGetSubscriptions():Promise<DBSubscription[]>{const{data,error}=await supabaseAdmin.from("subscriptions").select("*").order("created_at",{ascending:false});if(error)console.error("[SB]",error.message);return data||[];}
export async function dbSaveSubscription(s:Omit<DBSubscription,"created_at">):Promise<DBSubscription|null>{const{data,error}=await supabaseAdmin.from("subscriptions").insert(s).select().maybeSingle();if(error)console.error("[SB]",error.message);return data||null;}
export async function dbGetRevenue():Promise<DBRevenue[]>{const{data,error}=await supabaseAdmin.from("revenue").select("*").order("created_at",{ascending:false});if(error)console.error("[SB]",error.message);return data||[];}
export async function dbAddRevenue(r:Omit<DBRevenue,"id"|"created_at">):Promise<boolean>{const{error}=await supabaseAdmin.from("revenue").insert({...r,id:crypto.randomUUID()});return!error;}
export async function dbGetTotalRevenue():Promise<number>{const{data}=await supabaseAdmin.from("revenue").select("amount");return(data||[]).reduce((a:number,r:any)=>a+(r.amount||0),0);}

// ── Auto-migración: crea tablas si no existen ──────────────────────────────
export async function runMigrations(): Promise<void> {
  try {
    // Verificar si existe tabla subscriptions intentando leer
    const { error: e1 } = await supabaseAdmin.from("subscriptions").select("id").limit(1);
    if (e1 && e1.code === "42P01") {
      // Tabla no existe — crear via SQL RPC
      await supabaseAdmin.rpc("create_subscriptions_table").catch(() => {});
    }
    const { error: e2 } = await supabaseAdmin.from("revenue").select("id").limit(1);
    if (e2 && e2.code === "42P01") {
      await supabaseAdmin.rpc("create_revenue_table").catch(() => {});
    }
  } catch {}
}

// Versión robusta de dbGetSubscriptions que no falla si no existe la tabla
export async function dbGetSubscriptionsSafe(): Promise<DBSubscription[]> {
  try {
    const { data, error } = await supabaseAdmin.from("subscriptions").select("*").order("created_at", { ascending: false });
    if (error) return [];
    return data || [];
  } catch { return []; }
}

export async function dbGetRevenueSafe(): Promise<DBRevenue[]> {
  try {
    const { data, error } = await supabaseAdmin.from("revenue").select("*").order("created_at", { ascending: false });
    if (error) return [];
    return data || [];
  } catch { return []; }
}

export async function dbGetTotalRevenueSafe(): Promise<number> {
  try {
    const { data } = await supabaseAdmin.from("revenue").select("amount");
    return (data || []).reduce((a: number, r: any) => a + (r.amount || 0), 0);
  } catch { return 0; }
}

export async function dbAddRevenueSafe(r: Omit<DBRevenue, "id" | "created_at">): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.from("revenue").insert({ ...r, id: crypto.randomUUID() });
    return !error;
  } catch { return false; }
}

export async function dbSaveSubscriptionSafe(s: Omit<DBSubscription, "created_at">): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.from("subscriptions").insert(s);
    return !error;
  } catch { return false; }
}
