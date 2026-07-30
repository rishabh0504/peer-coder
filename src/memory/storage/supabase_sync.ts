/**
 * Optional Supabase sync for Stage 2. Soft-fails when credentials unset.
 */
import { loadEnv } from "../../core/config/env.js";

export function isSupabaseConfigured(): boolean {
  try {
    const env = loadEnv();
    return Boolean(env.SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY));
  } catch {
    return false;
  }
}

export async function tryGetSupabase(): Promise<
  import("@supabase/supabase-js").SupabaseClient | null
> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { getSupabaseInstance } = await import("../../integration/database/index.js");
    return getSupabaseInstance();
  } catch {
    return null;
  }
}

/** Upsert a workspace row by path hash; returns workspace uuid or null offline. */
export async function ensureWorkspaceRow(rootPath: string): Promise<string | null> {
  const client = await tryGetSupabase();
  if (!client) return null;
  const { createHash } = await import("node:crypto");
  const pathHash = createHash("sha256").update(rootPath).digest("hex");
  const { data, error } = await client
    .from("workspaces")
    .upsert(
      { path_hash: pathHash, root_path: rootPath, updated_at: new Date().toISOString() },
      { onConflict: "path_hash" },
    )
    .select("id")
    .maybeSingle();
  if (error) return null;
  return data?.id ?? null;
}

export async function syncRepositoryFact(row: {
  workspaceId: string;
  subject: string;
  predicate: string;
  object: string;
  source: string;
  confidence: number;
}): Promise<void> {
  const client = await tryGetSupabase();
  if (!client) return;
  const ws = await ensureWorkspaceRow(row.workspaceId);
  if (!ws) return;
  await client.from("repository_facts").insert({
    workspace_id: ws,
    subject: row.subject,
    predicate: row.predicate,
    object: row.object,
    source: row.source,
    confidence: row.confidence,
  });
}
