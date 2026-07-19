// Supabase client NexusAI — proyecto: zhkrkwmdpggzhoyqzqze
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zhkrkwmdpggzhoyqzqze.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpoa3Jrd21kcGdnemhveXF6cXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NTk0MjksImV4cCI6MjEwMDAzNTQyOX0.lTd78kBrZZLALWiW0b_3G4iCqhtD0RwTtkMCApCMhWM";
const SUPABASE_SECRET = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpoa3Jrd21kcGdnemhveXF6cXplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDQ1OTQyOSwiZXhwIjoyMTAwMDM1NDI5fQ.n99GDy0HRcKwcl2E1dZe5p2aLiZoO9ST4XbJoFWfL3Q";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET);

export interface DBUser { id:string;email:string;name?:string;role?:"user"|"admin";credits?:number;is_premium?:boolean;banned?:boolean;created_at?:string; }
export interface DBApp { id:string;user_id:string;user_email?:string;name:string;description?:string;html_code:string;created_at?:string; }
export interface DBWithdrawal { id:string;user_id:string;user_email?:string;amount:number;status:"pending"|"approved"|"rejected";note?:string;created_at?:string; }
export interface DBSubscription { id:string;user_id:string;user_email:string;plan:string;amount:number;status:"active"|"cancelled"|"pending";paypal_ref?:string;created_at?:string; }
export interface DBRevenue { id:string;source:string;amount:number;note?:string;created_at?:string; }

// ── Users ──
export async function dbGetUsers():Promise<DBUser[]>{const{data,error}=await supabaseAdmin.from("users").select("*").order("created_at",{ascending:false});if(error)console.error("[SB]",error.message);return data||[];}
export async function dbGetUserByEmail(e:string):Promise<DBUser|null>{const{data}=await supabaseAdmin.from("users").select("*").eq("email",e).maybeSingle();return data||null;}
export async function dbUpsertUser(u:Partial<DBUser>&{id:string}):Promise<DBUser|null>{const{data}=await supabaseAdmin.from("users").upsert(u,{onConflict:"id"}).select().maybeSingle();return data||null;}
export async function dbUpdateUser(id:string,up:Partial<DBUser>):Promise<boolean>{const{error}=await supabaseAdmin.from("users").update(up).eq("id",id);if(error)console.error("[SB]",error.message);return!error;}

// ── Apps ──
export async function dbGetApps():Promise<DBApp[]>{const{data,error}=await supabaseAdmin.from("apps").select("*").order("created_at",{ascending:false});if(error)console.error("[SB]",error.message);return data||[];}
export async function dbSaveApp(app:Omit<DBApp,"created_at">):Promise<DBApp|null>{const{data,error}=await supabaseAdmin.from("apps").insert(app).select().maybeSingle();if(error)console.error("[SB] dbSaveApp:",error.message);return data||null;}
export async function dbDeleteApp(id:string):Promise<boolean>{const{error}=await supabaseAdmin.from("apps").delete().eq("id",id);return!error;}

// ── Withdrawals ──
export async function dbGetWithdrawals():Promise<DBWithdrawal[]>{const{data,error}=await supabaseAdmin.from("withdrawals").select("*").order("created_at",{ascending:false});if(error)console.error("[SB]",error.message);return data||[];}
export async function dbSaveWithdrawal(w:Omit<DBWithdrawal,"created_at">):Promise<DBWithdrawal|null>{const{data,error}=await supabaseAdmin.from("withdrawals").insert(w).select().maybeSingle();if(error)console.error("[SB] dbSaveWithdrawal:",error.message);return data||null;}
export async function dbUpdateWithdrawal(id:string,up:Partial<DBWithdrawal>):Promise<boolean>{const{error}=await supabaseAdmin.from("withdrawals").update(up).eq("id",id);return!error;}

// ── Subscriptions ──
export async function dbGetSubscriptionsSafe():Promise<DBSubscription[]>{try{const{data,error}=await supabaseAdmin.from("subscriptions").select("*").order("created_at",{ascending:false});if(error)return[];return data||[];}catch{return[];}}
export async function dbSaveSubscriptionSafe(s:Omit<DBSubscription,"created_at">):Promise<boolean>{try{const{error}=await supabaseAdmin.from("subscriptions").upsert(s,{onConflict:"id"});return!error;}catch{return false;}}

// ── Aprobar Premium: activa is_premium en users + marca suscripción active ──
export async function dbApprovePremium(userId:string, subId:string):Promise<boolean>{
  try {
    const [r1,r2] = await Promise.all([
      supabaseAdmin.from("users").update({is_premium:true}).eq("id",userId),
      supabaseAdmin.from("subscriptions").update({status:"active"}).eq("id",subId),
    ]);
    return !r1.error && !r2.error;
  } catch { return false; }
}

// ── Revenue ──
export async function dbGetRevenueSafe():Promise<DBRevenue[]>{try{const{data,error}=await supabaseAdmin.from("revenue").select("*").order("created_at",{ascending:false});if(error)return[];return data||[];}catch{return[];}}
export async function dbGetTotalRevenueSafe():Promise<number>{try{const{data}=await supabaseAdmin.from("revenue").select("amount");return(data||[]).reduce((a:number,r:any)=>a+(r.amount||0),0);}catch{return 0;}}
export async function dbAddRevenueSafe(r:Omit<DBRevenue,"id"|"created_at">):Promise<boolean>{try{const{error}=await supabaseAdmin.from("revenue").insert({...r,id:crypto.randomUUID()});return!error;}catch{return false;}}

// ── Migración legacy ──
export async function runMigrations():Promise<void>{}
export async function dbGetSubscriptions():Promise<DBSubscription[]>{return dbGetSubscriptionsSafe();}
export async function dbGetRevenue():Promise<DBRevenue[]>{return dbGetRevenueSafe();}
export async function dbGetTotalRevenue():Promise<number>{return dbGetTotalRevenueSafe();}
export async function dbAddRevenue(r:Omit<DBRevenue,"id"|"created_at">):Promise<boolean>{return dbAddRevenueSafe(r);}
