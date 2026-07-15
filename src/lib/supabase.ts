// ============================================================
// Supabase client — NexusAI
// ============================================================
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const SUPABASE_SECRET = import.meta.env.VITE_SUPABASE_SECRET_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET);

export interface DBUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  credits: number;
  balance: number;
  banned: boolean;
  created_at?: string;
}

export interface DBApp {
  id: string;
  user_id: string;
  user_email: string;
  name: string;
  description: string;
  html_code: string;
  created_at?: string;
}

export interface DBWithdrawal {
  id: string;
  user_id: string;
  user_email: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  note: string;
  created_at?: string;
}

export async function dbGetUsers(): Promise<DBUser[]> {
  const { data } = await supabaseAdmin.from("users").select("*").order("created_at", { ascending: false });
  return data || [];
}

export async function dbGetUserByEmail(email: string): Promise<DBUser | null> {
  const { data } = await supabaseAdmin.from("users").select("*").eq("email", email).maybeSingle();
  return data || null;
}

export async function dbUpsertUser(user: Partial<DBUser> & { id: string }): Promise<DBUser | null> {
  const { data } = await supabaseAdmin.from("users").upsert(user, { onConflict: "id" }).select().maybeSingle();
  return data || null;
}

export async function dbUpdateUser(id: string, updates: Partial<DBUser>): Promise<boolean> {
  const { error } = await supabaseAdmin.from("users").update(updates).eq("id", id);
  return !error;
}

export async function dbGetApps(): Promise<DBApp[]> {
  const { data } = await supabaseAdmin.from("apps").select("*").order("created_at", { ascending: false });
  return data || [];
}

export async function dbSaveApp(app: Omit<DBApp, "created_at">): Promise<DBApp | null> {
  const { data } = await supabaseAdmin.from("apps").insert(app).select().maybeSingle();
  return data || null;
}

export async function dbDeleteApp(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from("apps").delete().eq("id", id);
  return !error;
}

export async function dbGetWithdrawals(): Promise<DBWithdrawal[]> {
  const { data } = await supabaseAdmin.from("withdrawals").select("*").order("created_at", { ascending: false });
  return data || [];
}

export async function dbSaveWithdrawal(w: Omit<DBWithdrawal, "created_at">): Promise<DBWithdrawal | null> {
  const { data } = await supabaseAdmin.from("withdrawals").insert(w).select().maybeSingle();
  return data || null;
}

export async function dbUpdateWithdrawal(id: string, updates: Partial<DBWithdrawal>): Promise<boolean> {
  const { error } = await supabaseAdmin.from("withdrawals").update(updates).eq("id", id);
  return !error;
}
