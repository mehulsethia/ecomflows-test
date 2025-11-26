import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

export async function ensurePublicUserProfile(user: User | null | undefined) {
  if (!user) return;
  const email = user.email;
  const name =
    (user.user_metadata as { name?: string | null } | null)?.name ?? null;

  if (!email) return;

  const { error } = await supabase
    .from("users")
    .upsert(
      {
        id: user.id,
        email,
        name,
      },
      { onConflict: "id" },
    );

  if (error) {
    console.error("Failed to sync public.users profile", error);
  }
}
