import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/database.types"

// Create a single supabase client for the entire client-side application
let supabaseClient: ReturnType<typeof createClientComponentClient<Database>>

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    supabaseClient = createClientComponentClient<Database>({
      options: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }
  return supabaseClient
}

// Clear the client instance (useful for logout)
export const clearSupabaseClient = () => {
  supabaseClient = undefined
}
