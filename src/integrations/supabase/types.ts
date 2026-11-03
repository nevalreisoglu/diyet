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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achievement_date: string
          achievement_type: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_date?: string
          achievement_type: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_date?: string
          achievement_type?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      beverage_intake: {
        Row: {
          beverage_type: string
          created_at: string
          cups: number
          id: string
          intake_date: string
          user_id: string
        }
        Insert: {
          beverage_type: string
          created_at?: string
          cups?: number
          id?: string
          intake_date?: string
          user_id: string
        }
        Update: {
          beverage_type?: string
          created_at?: string
          cups?: number
          id?: string
          intake_date?: string
          user_id?: string
        }
        Relationships: []
      }
      body_measurements: {
        Row: {
          arm_cm: number | null
          bmi: number | null
          bmr_kcal: number | null
          body_fat_pct: number | null
          body_water_pct: number | null
          bone_mass_kg: number | null
          chest_cm: number | null
          created_at: string
          hip_cm: number | null
          id: string
          measured_at: string
          muscle_mass_kg: number | null
          notes: string | null
          raw: Json | null
          source: string
          thigh_cm: number | null
          user_id: string
          visceral_fat_level: number | null
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          arm_cm?: number | null
          bmi?: number | null
          bmr_kcal?: number | null
          body_fat_pct?: number | null
          body_water_pct?: number | null
          bone_mass_kg?: number | null
          chest_cm?: number | null
          created_at?: string
          hip_cm?: number | null
          id?: string
          measured_at?: string
          muscle_mass_kg?: number | null
          notes?: string | null
          raw?: Json | null
          source?: string
          thigh_cm?: number | null
          user_id: string
          visceral_fat_level?: number | null
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          arm_cm?: number | null
          bmi?: number | null
          bmr_kcal?: number | null
          body_fat_pct?: number | null
          body_water_pct?: number | null
          bone_mass_kg?: number | null
          chest_cm?: number | null
          created_at?: string
          hip_cm?: number | null
          id?: string
          measured_at?: string
          muscle_mass_kg?: number | null
          notes?: string | null
          raw?: Json | null
          source?: string
          thigh_cm?: number | null
          user_id?: string
          visceral_fat_level?: number | null
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      calorie_cache: {
        Row: {
          calories: number
          created_at: string
          food_name: string
          food_name_normalized: string
          id: string
          source: string
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          calories: number
          created_at?: string
          food_name: string
          food_name_normalized: string
          id?: string
          source?: string
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          calories?: number
          created_at?: string
          food_name?: string
          food_name_normalized?: string
          id?: string
          source?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      daily_summaries: {
        Row: {
          created_at: string
          focus: string | null
          headline: string
          id: string
          inputs: Json | null
          message: string
          summary_date: string
          tone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          focus?: string | null
          headline: string
          id?: string
          inputs?: Json | null
          message: string
          summary_date?: string
          tone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          focus?: string | null
          headline?: string
          id?: string
          inputs?: Json | null
          message?: string
          summary_date?: string
          tone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_foods: {
        Row: {
          calories: number
          carbs: number | null
          created_at: string
          day_index: number | null
          day_label: string | null
          fat: number | null
          id: string
          meal_type: string | null
          name: string
          protein: number | null
          user_id: string
        }
        Insert: {
          calories?: number
          carbs?: number | null
          created_at?: string
          day_index?: number | null
          day_label?: string | null
          fat?: number | null
          id?: string
          meal_type?: string | null
          name: string
          protein?: number | null
          user_id: string
        }
        Update: {
          calories?: number
          carbs?: number | null
          created_at?: string
          day_index?: number | null
          day_label?: string | null
          fat?: number | null
          id?: string
          meal_type?: string | null
          name?: string
          protein?: number | null
          user_id?: string
        }
        Relationships: []
      }
      dietitian_clients: {
        Row: { id: string; dietitian_id: string; client_id: string; status: string; created_at: string }
        Insert: { id?: string; dietitian_id: string; client_id: string; status?: string; created_at?: string }
        Update: { id?: string; dietitian_id?: string; client_id?: string; status?: string; created_at?: string }
        Relationships: []
      }
      dietitian_invites: {
        Row: { dietitian_id: string; code: string; created_at: string }
        Insert: { dietitian_id: string; code: string; created_at?: string }
        Update: { dietitian_id?: string; code?: string; created_at?: string }
        Relationships: []
      }
      exercise_log: {
        Row: {
          created_at: string
          duration_minutes: number
          exercise_date: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          exercise_date?: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          exercise_date?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      food_items: {
        Row: {
          calories: number
          carbs: number | null
          created_at: string
          fat: number | null
          id: string
          meal_id: string
          name: string
          protein: number | null
        }
        Insert: {
          calories?: number
          carbs?: number | null
          created_at?: string
          fat?: number | null
          id?: string
          meal_id: string
          name: string
          protein?: number | null
        }
        Update: {
          calories?: number
          carbs?: number | null
          created_at?: string
          fat?: number | null
          id?: string
          meal_id?: string
          name?: string
          protein?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "food_items_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_schedules: {
        Row: {
          created_at: string
          id: string
          meal_type: string
          scheduled_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meal_type: string
          scheduled_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meal_type?: string
          scheduled_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meals: {
        Row: {
          created_at: string
          id: string
          meal_date: string
          meal_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meal_date?: string
          meal_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meal_date?: string
          meal_type?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_days: {
        Row: { id: string; client_id: string; dietitian_id: string; plan_date: string; note: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; client_id: string; dietitian_id: string; plan_date: string; note?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; client_id?: string; dietitian_id?: string; plan_date?: string; note?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      plan_items: {
        Row: { id: string; plan_day_id: string; client_id: string; meal_type: string; name: string; calories: number; protein: number | null; carbs: number | null; fat: number | null; sort_order: number; created_at: string }
        Insert: { id?: string; plan_day_id: string; client_id: string; meal_type: string; name: string; calories?: number; protein?: number | null; carbs?: number | null; fat?: number | null; sort_order?: number; created_at?: string }
        Update: { id?: string; plan_day_id?: string; client_id?: string; meal_type?: string; name?: string; calories?: number; protein?: number | null; carbs?: number | null; fat?: number | null; sort_order?: number; created_at?: string }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          created_at: string
          current_weight_kg: number | null
          display_name: string | null
          role: string
          gender: string | null
          height_cm: number | null
          id: string
          target_calories: number | null
          target_water_ml: number | null
          target_weight_kg: number | null
          updated_at: string
          user_id: string
          weight_goal_weeks: number | null
        }
        Insert: {
          age?: number | null
          created_at?: string
          current_weight_kg?: number | null
          display_name?: string | null
          role?: string
          gender?: string | null
          height_cm?: number | null
          id?: string
          target_calories?: number | null
          target_water_ml?: number | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id: string
          weight_goal_weeks?: number | null
        }
        Update: {
          age?: number | null
          created_at?: string
          current_weight_kg?: number | null
          display_name?: string | null
          role?: string
          gender?: string | null
          height_cm?: number | null
          id?: string
          target_calories?: number | null
          target_water_ml?: number | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id?: string
          weight_goal_weeks?: number | null
        }
        Relationships: []
      }
      water_intake: {
        Row: {
          amount_ml: number
          created_at: string
          id: string
          intake_date: string
          user_id: string
        }
        Insert: {
          amount_ml?: number
          created_at?: string
          id?: string
          intake_date?: string
          user_id: string
        }
        Update: {
          amount_ml?: number
          created_at?: string
          id?: string
          intake_date?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_dietitian_invite: { Args: Record<string, never>; Returns: string }
      link_dietitian: { Args: { p_code: string }; Returns: Json }
      is_dietitian_of: { Args: { p_client: string }; Returns: boolean }
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
  public: {
    Enums: {},
  },
} as const
