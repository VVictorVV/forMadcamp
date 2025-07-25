export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      CAMP_CLASSES: {
        Row: {
          class_id: number
          class_num: number
          created_at: string | null
          season_id: number
        }
        Insert: {
          class_id?: number
          class_num: number
          created_at?: string | null
          season_id: number
        }
        Update: {
          class_id?: number
          class_num?: number
          created_at?: string | null
          season_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "CAMP_CLASSES_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "SEASONS"
            referencedColumns: ["season_id"]
          },
        ]
      }
      MEMORIES: {
        Row: {
          class_id: number
          created_at: string | null
          image_uri: string | null
          memory_id: number
          name: string | null
        }
        Insert: {
          class_id: number
          created_at?: string | null
          image_uri?: string | null
          memory_id?: number
          name?: string | null
        }
        Update: {
          class_id?: number
          created_at?: string | null
          image_uri?: string | null
          memory_id?: number
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "MEMORIES_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "CAMP_CLASSES"
            referencedColumns: ["class_id"]
          },
        ]
      }
      POLL_OPTIONS: {
        Row: {
          option_id: number
          option_name: string
          poll_id: number
        }
        Insert: {
          option_id?: number
          option_name: string
          poll_id: number
        }
        Update: {
          option_id?: number
          option_name?: string
          poll_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "POLL_OPTIONS_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "POLLS"
            referencedColumns: ["poll_id"]
          },
        ]
      }
      POLLS: {
        Row: {
          class_id: number
          created_at: string | null
          deadline: string | null
          made_by: number
          poll_id: number
          poll_name: string
        }
        Insert: {
          class_id: number
          created_at?: string | null
          deadline?: string | null
          made_by: number
          poll_id?: number
          poll_name: string
        }
        Update: {
          class_id?: number
          created_at?: string | null
          deadline?: string | null
          made_by?: number
          poll_id?: number
          poll_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "POLLS_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "CAMP_CLASSES"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "POLLS_made_by_fkey"
            columns: ["made_by"]
            isOneToOne: false
            referencedRelation: "USERS"
            referencedColumns: ["user_id"]
          },
        ]
      }
      PROJECTS: {
        Row: {
          class_id: number
          created_at: string | null
          planning: string | null
          progress: number | null
          project_id: number
          project_name: string
          user_id_1: number
          user_id_2: number
          week_num: number | null
        }
        Insert: {
          class_id: number
          created_at?: string | null
          planning?: string | null
          progress?: number | null
          project_id?: number
          project_name: string
          user_id_1: number
          user_id_2: number
          week_num?: number | null
        }
        Update: {
          class_id?: number
          created_at?: string | null
          planning?: string | null
          progress?: number | null
          project_id?: number
          project_name?: string
          user_id_1?: number
          user_id_2?: number
          week_num?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "PROJECTS_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "CAMP_CLASSES"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "PROJECTS_user_id_1_fkey"
            columns: ["user_id_1"]
            isOneToOne: false
            referencedRelation: "USERS"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "PROJECTS_user_id_2_fkey"
            columns: ["user_id_2"]
            isOneToOne: false
            referencedRelation: "USERS"
            referencedColumns: ["user_id"]
          },
        ]
      }
      SCHEDULE_USERS: {
        Row: {
          role: string | null
          schedule_id: number
          status: string | null
          user_id: number
        }
        Insert: {
          role?: string | null
          schedule_id: number
          status?: string | null
          user_id: number
        }
        Update: {
          role?: string | null
          schedule_id?: number
          status?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "SCHEDULE_USERS_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "SCHEDULES"
            referencedColumns: ["schedule_id"]
          },
          {
            foreignKeyName: "SCHEDULE_USERS_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "USERS"
            referencedColumns: ["user_id"]
          },
        ]
      }
      SCHEDULES: {
        Row: {
          class_id: number
          created_at: string | null
          description: string | null
          related_poll: number | null
          schedule_id: number
          schedule_name: string
          when: string
        }
        Insert: {
          class_id: number
          created_at?: string | null
          description?: string | null
          related_poll?: number | null
          schedule_id?: number
          schedule_name: string
          when: string
        }
        Update: {
          class_id?: number
          created_at?: string | null
          description?: string | null
          related_poll?: number | null
          schedule_id?: number
          schedule_name?: string
          when?: string
        }
        Relationships: [
          {
            foreignKeyName: "SCHEDULES_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "CAMP_CLASSES"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "SCHEDULES_related_poll_fkey"
            columns: ["related_poll"]
            isOneToOne: false
            referencedRelation: "POLLS"
            referencedColumns: ["poll_id"]
          },
        ]
      }
      SCRUMS: {
        Row: {
          date: string
          done: string | null
          others: string | null
          plan: string | null
          project_id: number
          scrum_id: number
        }
        Insert: {
          date: string
          done?: string | null
          others?: string | null
          plan?: string | null
          project_id: number
          scrum_id?: number
        }
        Update: {
          date?: string
          done?: string | null
          others?: string | null
          plan?: string | null
          project_id?: number
          scrum_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "SCRUMS_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "PROJECTS"
            referencedColumns: ["project_id"]
          },
        ]
      }
      SEASONS: {
        Row: {
          name: string
          season_id: number
        }
        Insert: {
          name: string
          season_id?: number
        }
        Update: {
          name?: string
          season_id?: number
        }
        Relationships: []
      }
      TOPIC_INTERESTS: {
        Row: {
          expressed_at: string | null
          level: number | null
          topic_id: number
          user_id: number
        }
        Insert: {
          expressed_at?: string | null
          level?: number | null
          topic_id: number
          user_id: number
        }
        Update: {
          expressed_at?: string | null
          level?: number | null
          topic_id?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "TOPIC_INTERESTS_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "TOPICS"
            referencedColumns: ["topic_id"]
          },
          {
            foreignKeyName: "TOPIC_INTERESTS_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "USERS"
            referencedColumns: ["user_id"]
          },
        ]
      }
      TOPICS: {
        Row: {
          created_at: string | null
          creator_id: number
          description: string | null
          title: string
          topic_id: number
        }
        Insert: {
          created_at?: string | null
          creator_id: number
          description?: string | null
          title: string
          topic_id?: number
        }
        Update: {
          created_at?: string | null
          creator_id?: number
          description?: string | null
          title?: string
          topic_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "TOPICS_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "USERS"
            referencedColumns: ["user_id"]
          },
        ]
      }
      USERS: {
        Row: {
          class_id: number | null
          created_at: string | null
          email: string
          name: string
          password: string
          user_id: number
        }
        Insert: {
          class_id?: number | null
          created_at?: string | null
          email: string
          name: string
          password: string
          user_id?: number
        }
        Update: {
          class_id?: number | null
          created_at?: string | null
          email?: string
          name?: string
          password?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "USERS_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "CAMP_CLASSES"
            referencedColumns: ["class_id"]
          },
        ]
      }
      VOTES: {
        Row: {
          option_id: number
          poll_id: number
          user_id: number
          vote_id: number
          voted_at: string | null
        }
        Insert: {
          option_id: number
          poll_id: number
          user_id: number
          vote_id?: number
          voted_at?: string | null
        }
        Update: {
          option_id?: number
          poll_id?: number
          user_id?: number
          vote_id?: number
          voted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "VOTES_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "POLL_OPTIONS"
            referencedColumns: ["option_id"]
          },
          {
            foreignKeyName: "VOTES_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "POLLS"
            referencedColumns: ["poll_id"]
          },
          {
            foreignKeyName: "VOTES_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "USERS"
            referencedColumns: ["user_id"]
          },
        ]
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
