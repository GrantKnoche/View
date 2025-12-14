
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------
// 🔴 请把下面双引号里的内容，换成你自己的真实数据！
// ---------------------------------------------------------

// 1. 填入你的 Project URL
const supabaseUrl = "https://novzguiswsrvkamgffqv.supabase.co"; 

// 2. 填入你的 anon Key
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vdnpndWlzd3NydmthbWdmZnF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTYxMTIsImV4cCI6MjA4MDQzMjExMn0.YjtbsSQj3pH8dttzXVS1aKH470Ult4nb6E44jKS5F-Q"; 

// ---------------------------------------------------------

let client: SupabaseClient;

try {
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
    console.error('❌ 错误：Supabase Key 未配置或为占位符！');
    throw new Error("Invalid Supabase Configuration");
  }
  client = createClient(supabaseUrl, supabaseAnonKey);
} catch (error) {
  console.warn("⚠️ Supabase 客户端初始化失败，将使用 Mock 模式防止崩溃:", error);
  
  // Minimal Mock Client to allow app to load without crashing
  client = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ error: { message: "Supabase not configured properly" } }),
      signUp: async () => ({ error: { message: "Supabase not configured properly" } }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: async () => ({ data: [], error: null }),
      insert: async () => ({ data: null, error: null }),
    })
  } as unknown as SupabaseClient;
}

export const supabase = client;
