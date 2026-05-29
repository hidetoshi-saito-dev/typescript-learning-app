// DB スキーマの型定義（将来 supabase gen types typescript --local で自動生成に移行可）

export type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
  created_at: string
}

export type LessonProgress = {
  user_id: string
  course_id: string
  lesson_id: string
  completed_at: string
}

// Supabase クライアントの型パラメーターとして渡す Database 型
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id'>>
        Relationships: []
      }
      lesson_progress: {
        Row: LessonProgress
        Insert: Omit<LessonProgress, 'completed_at'>
        Update: Partial<LessonProgress>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
