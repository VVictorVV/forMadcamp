import { createClient } from '@supabase/supabase-js'

// .env.local 파일에 설정된 환경 변수를 사용하여 Supabase 클라이언트를 생성합니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 