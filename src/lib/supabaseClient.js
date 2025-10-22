import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yookisciusolsxqbrims.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvb2tpc2NpdXNvbHN4cWJyaW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDIzMjcsImV4cCI6MjA3NjU3ODMyN30.XxVpE-BM-Kfz54YtKTq5msJlV9Hj_gwHYe2iUMOYrKU'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

