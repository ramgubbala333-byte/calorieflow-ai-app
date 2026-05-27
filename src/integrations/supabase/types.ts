export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      daily_activity: {
        Row: {
          active_calories: number | null
          activity_date: string
          id: string
          last_synced_at: string | null
          platform: Database["public"]["Enums"]["health_platform"]
          steps: number | null
          user_id: string
          workout_minutes: number | null
        }
        Insert: {
          active_calories?: number | null
          activity_date: string
          id?: string
          last_synced_at?: string | null
          platform: Database["public"]["Enums"]["health_platform"]
          steps?: number | null
          user_id: string
          workout_minutes?: number | null
        }
        Update: {
          active_calories?: number | null
          activity_date?: string
          id?: string
          last_synced_at?: string | null
          platform?: Database["public"]["Enums"]["health_platform"]
          steps?: number | null
          user_id?: string
          workout_minutes?: number | null
        }
        Relationships: []
      }
      deleted_meals: {
        Row: {
          deleted_at: string
          id: string
          original_id: string
          snapshot: Json
          user_id: string
        }
        Insert: {
          deleted_at?: string
          id?: string
          original_id: string
          snapshot: Json
          user_id: string
        }
        Update: {
          deleted_at?: string
          id?: string
          original_id?: string
          snapshot?: Json
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          calories: number | null
          carbs: number | null
          created_at: string
          fat: number | null
          id: string
          name: string
          protein: number | null
          serving: string | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          created_at?: string
          fat?: number | null
          id?: string
          name: string
          protein?: number | null
          serving?: string | null
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          created_at?: string
          fat?: number | null
          id?: string
          name?: string
          protein?: number | null
          serving?: string | null
          user_id?: string
        }
        Relationships: []
      }
      food_entries: {
        Row: {
          barcode: string | null
          brand: string | null
          calories: number | null
          carbs: number | null
          created_at: string
          fat: number | null
          id: string
          meal_id: string | null
          name: string
          protein: number | null
          serving_size: number | null
          serving_unit: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          calories?: number | null
          carbs?: number | null
          created_at?: string
          fat?: number | null
          id?: string
          meal_id?: string | null
          name: string
          protein?: number | null
          serving_size?: number | null
          serving_unit?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          calories?: number | null
          carbs?: number | null
          created_at?: string
          fat?: number | null
          id?: string
          meal_id?: string | null
          name?: string
          protein?: number | null
          serving_size?: number | null
          serving_unit?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_entries_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          auto_adjust_remaining: boolean | null
          calc_method: string | null
          calories: number
          carbs: number
          fat: number
          id: string
          protein: number
          updated_at: string
          use_exercise_calories: boolean | null
          user_id: string
        }
        Insert: {
          auto_adjust_remaining?: boolean | null
          calc_method?: string | null
          calories?: number
          carbs?: number
          fat?: number
          id?: string
          protein?: number
          updated_at?: string
          use_exercise_calories?: boolean | null
          user_id: string
        }
        Update: {
          auto_adjust_remaining?: boolean | null
          calc_method?: string | null
          calories?: number
          carbs?: number
          fat?: number
          id?: string
          protein?: number
          updated_at?: string
          use_exercise_calories?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      health_connections: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          last_synced_at: string | null
          platform: Database["public"]["Enums"]["health_platform"]
          scopes: string[] | null
          status: Database["public"]["Enums"]["conn_status_t"]
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          last_synced_at?: string | null
          platform: Database["public"]["Enums"]["health_platform"]
          scopes?: string[] | null
          status?: Database["public"]["Enums"]["conn_status_t"]
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          last_synced_at?: string | null
          platform?: Database["public"]["Enums"]["health_platform"]
          scopes?: string[] | null
          status?: Database["public"]["Enums"]["conn_status_t"]
          user_id?: string
        }
        Relationships: []
      }
      health_sync_logs: {
        Row: {
          created_at: string
          id: string
          message: string | null
          platform: Database["public"]["Enums"]["health_platform"]
          sync_status: Database["public"]["Enums"]["sync_status_t"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          platform: Database["public"]["Enums"]["health_platform"]
          sync_status: Database["public"]["Enums"]["sync_status_t"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          platform?: Database["public"]["Enums"]["health_platform"]
          sync_status?: Database["public"]["Enums"]["sync_status_t"]
          user_id?: string
        }
        Relationships: []
      }
      meals: {
        Row: {
          calories: number
          carbs: number | null
          created_at: string
          emoji: string | null
          fat: number | null
          id: string
          logged_at: string
          meal_type: string
          name: string
          protein: number | null
          serving: string | null
          source: string | null
          time_label: string | null
          user_id: string
        }
        Insert: {
          calories?: number
          carbs?: number | null
          created_at?: string
          emoji?: string | null
          fat?: number | null
          id?: string
          logged_at?: string
          meal_type: string
          name: string
          protein?: number | null
          serving?: string | null
          source?: string | null
          time_label?: string | null
          user_id: string
        }
        Update: {
          calories?: number
          carbs?: number | null
          created_at?: string
          emoji?: string | null
          fat?: number | null
          id?: string
          logged_at?: string
          meal_type?: string
          name?: string
          protein?: number | null
          serving?: string | null
          source?: string | null
          time_label?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          energy_unit: string | null
          food_preference: string | null
          height_cm: number | null
          id: string
          onboarded: boolean | null
          units: string | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          energy_unit?: string | null
          food_preference?: string | null
          height_cm?: number | null
          id?: string
          onboarded?: boolean | null
          units?: string | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          energy_unit?: string | null
          food_preference?: string | null
          height_cm?: number | null
          id?: string
          onboarded?: boolean | null
          units?: string | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          current_period_end: string | null
          id: string
          provider: string | null
          provider_subscription_id: string | null
          status: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          current_period_end?: string | null
          id?: string
          provider?: string | null
          provider_subscription_id?: string | null
          status?: string
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          current_period_end?: string | null
          id?: string
          provider?: string | null
          provider_subscription_id?: string | null
          status?: string
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      synced_weight: {
        Row: {
          created_at: string
          id: string
          measured_at: string
          platform: Database["public"]["Enums"]["health_platform"] | null
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          measured_at: string
          platform?: Database["public"]["Enums"]["health_platform"] | null
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          measured_at?: string
          platform?: Database["public"]["Enums"]["health_platform"] | null
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      templates: {
        Row: {
          created_at: string
          id: string
          meals: Json
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meals?: Json
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meals?: Json
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          active_calories: number | null
          completed: boolean | null
          created_at: string
          id: string
          platform: Database["public"]["Enums"]["health_platform"] | null
          user_id: string
          workout_end_time: string
          workout_start_time: string
          workout_type: string
        }
        Insert: {
          active_calories?: number | null
          completed?: boolean | null
          created_at?: string
          id?: string
          platform?: Database["public"]["Enums"]["health_platform"] | null
          user_id: string
          workout_end_time: string
          workout_start_time: string
          workout_type: string
        }
        Update: {
          active_calories?: number | null
          completed?: boolean | null
          created_at?: string
          id?: string
          platform?: Database["public"]["Enums"]["health_platform"] | null
          user_id?: string
          workout_end_time?: string
          workout_start_time?: string
          workout_type?: string
        }
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
      conn_status_t: "connected" | "disconnected" | "error" | "pending"
      health_platform:
        | "apple_health"
        | "google_health_connect"
        | "fitbit"
        | "garmin"
        | "samsung_health"
      sync_status_t: "success" | "partial" | "failed" | "permission_denied"
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
  public: {
    Enums: {
      conn_status_t: ["connected", "disconnected", "error", "pending"],
      health_platform: [
        "apple_health",
        "google_health_connect",
        "fitbit",
        "garmin",
        "samsung_health",
      ],
      sync_status_t: ["success", "partial", "failed", "permission_denied"],
    },
  },
} as const
