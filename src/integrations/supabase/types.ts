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
      customer_devices: {
        Row: {
          brand: string
          color: string | null
          created_at: string
          customer_id: string
          id: string
          imei: string | null
          model: string
          shop_id: string
          storage: string | null
          unlock_code: string | null
          updated_at: string
        }
        Insert: {
          brand?: string
          color?: string | null
          created_at?: string
          customer_id: string
          id?: string
          imei?: string | null
          model: string
          shop_id: string
          storage?: string | null
          unlock_code?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string
          color?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          imei?: string | null
          model?: string
          shop_id?: string
          storage?: string | null
          unlock_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_devices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_devices_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string
          shop_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone: string
          shop_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      deduction_rules: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["rule_category"]
          created_at: string
          deduction: number
          id: string
          is_blocking: boolean
          name: string
          shop_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: Database["public"]["Enums"]["rule_category"]
          created_at?: string
          deduction?: number
          id?: string
          is_blocking?: boolean
          name: string
          shop_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["rule_category"]
          created_at?: string
          deduction?: number
          id?: string
          is_blocking?: boolean
          name?: string
          shop_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deduction_rules_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      device_models: {
        Row: {
          active: boolean
          base_price: number
          brand: string
          colors: string[]
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          storages: number[]
        }
        Insert: {
          active?: boolean
          base_price?: number
          brand?: string
          colors?: string[]
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          storages?: number[]
        }
        Update: {
          active?: boolean
          base_price?: number
          brand?: string
          colors?: string[]
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          storages?: number[]
        }
        Relationships: []
      }
      estimation_defects: {
        Row: {
          category: Database["public"]["Enums"]["rule_category"]
          deduction: number
          estimation_id: string
          id: string
          is_blocking: boolean
          rule_id: string | null
          rule_name: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["rule_category"]
          deduction?: number
          estimation_id: string
          id?: string
          is_blocking?: boolean
          rule_id?: string | null
          rule_name: string
        }
        Update: {
          category?: Database["public"]["Enums"]["rule_category"]
          deduction?: number
          estimation_id?: string
          id?: string
          is_blocking?: boolean
          rule_id?: string | null
          rule_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimation_defects_estimation_id_fkey"
            columns: ["estimation_id"]
            isOneToOne: false
            referencedRelation: "estimations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimation_defects_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "deduction_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      estimations: {
        Row: {
          base_price: number
          color: string
          created_at: string
          employee_name: string
          final_price: number
          id: string
          imei: string | null
          is_blocked: boolean
          model_id: string | null
          model_name: string
          notes: string | null
          shop_id: string
          storage_gb: number
          total_deduction: number
          user_id: string
        }
        Insert: {
          base_price?: number
          color: string
          created_at?: string
          employee_name?: string
          final_price?: number
          id?: string
          imei?: string | null
          is_blocked?: boolean
          model_id?: string | null
          model_name: string
          notes?: string | null
          shop_id: string
          storage_gb: number
          total_deduction?: number
          user_id: string
        }
        Update: {
          base_price?: number
          color?: string
          created_at?: string
          employee_name?: string
          final_price?: number
          id?: string
          imei?: string | null
          is_blocked?: boolean
          model_id?: string | null
          model_name?: string
          notes?: string | null
          shop_id?: string
          storage_gb?: number
          total_deduction?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimations_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "device_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimations_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          customer_id: string
          customer_snapshot: Json
          device_snapshot: Json
          id: string
          issued_at: string
          lines: Json
          number: string
          repair_id: string
          shop_id: string
          shop_snapshot: Json
          total: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          customer_snapshot?: Json
          device_snapshot?: Json
          id?: string
          issued_at?: string
          lines?: Json
          number: string
          repair_id: string
          shop_id: string
          shop_snapshot?: Json
          total?: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          customer_snapshot?: Json
          device_snapshot?: Json
          id?: string
          issued_at?: string
          lines?: Json
          number?: string
          repair_id?: string
          shop_id?: string
          shop_snapshot?: Json
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: true
            referencedRelation: "repairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          shop_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          shop_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_items: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          name: string
          quantity: number
          repair_id: string
          service_id: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          id?: string
          name: string
          quantity?: number
          repair_id: string
          service_id?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          name?: string
          quantity?: number
          repair_id?: string
          service_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "repair_items_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "repair_services"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_photos: {
        Row: {
          created_at: string
          id: string
          phase: Database["public"]["Enums"]["photo_phase"]
          repair_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          phase?: Database["public"]["Enums"]["photo_phase"]
          repair_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          phase?: Database["public"]["Enums"]["photo_phase"]
          repair_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_photos_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repairs"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_services: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          name: string
          price: number
          shop_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name: string
          price?: number
          shop_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          price?: number
          shop_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_services_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_status_history: {
        Row: {
          comment: string | null
          created_at: string
          employee_name: string
          id: string
          repair_id: string
          status: Database["public"]["Enums"]["repair_status"]
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          employee_name?: string
          id?: string
          repair_id: string
          status: Database["public"]["Enums"]["repair_status"]
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          employee_name?: string
          id?: string
          repair_id?: string
          status?: Database["public"]["Enums"]["repair_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_status_history_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repairs"
            referencedColumns: ["id"]
          },
        ]
      }
      repairs: {
        Row: {
          brand: string
          color: string | null
          condition: string | null
          created_at: string
          customer_id: string
          device_id: string | null
          employee_name: string
          id: string
          imei: string | null
          issue: string
          model: string
          reference: string
          shop_id: string
          status: Database["public"]["Enums"]["repair_status"]
          storage: string | null
          total_minutes: number
          total_price: number
          unlock_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string
          color?: string | null
          condition?: string | null
          created_at?: string
          customer_id: string
          device_id?: string | null
          employee_name?: string
          id?: string
          imei?: string | null
          issue?: string
          model: string
          reference: string
          shop_id: string
          status?: Database["public"]["Enums"]["repair_status"]
          storage?: string | null
          total_minutes?: number
          total_price?: number
          unlock_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string
          color?: string | null
          condition?: string | null
          created_at?: string
          customer_id?: string
          device_id?: string | null
          employee_name?: string
          id?: string
          imei?: string | null
          issue?: string
          model?: string
          reference?: string
          shop_id?: string
          status?: Database["public"]["Enums"]["repair_status"]
          storage?: string | null
          total_minutes?: number
          total_price?: number
          unlock_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repairs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repairs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "customer_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repairs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_prices: {
        Row: {
          base_price: number
          color: string
          id: string
          model_id: string
          shop_id: string
          storage_gb: number
          updated_at: string
        }
        Insert: {
          base_price: number
          color?: string
          id?: string
          model_id: string
          shop_id: string
          storage_gb: number
          updated_at?: string
        }
        Update: {
          base_price?: number
          color?: string
          id?: string
          model_id?: string
          shop_id?: string
          storage_gb?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_prices_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "device_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_prices_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_sequences: {
        Row: {
          kind: string
          shop_id: string
          value: number
          year: number
        }
        Insert: {
          kind: string
          shop_id: string
          value?: number
          year: number
        }
        Update: {
          kind?: string
          shop_id?: string
          value?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_sequences_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          shop_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          shop_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_shop_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_shop_reference: { Args: { _kind: string }; Returns: string }
      seed_default_rules: { Args: { _shop_id: string }; Returns: undefined }
      seed_default_services: { Args: { _shop_id: string }; Returns: undefined }
      storage_step: { Args: { _gb: number }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "employee"
      photo_phase: "avant" | "pendant" | "apres"
      repair_status:
        | "recu"
        | "diagnostic"
        | "attente_validation"
        | "attente_piece"
        | "en_reparation"
        | "tests"
        | "termine"
        | "restitue"
        | "annule"
      rule_category: "esthetique" | "technique" | "blocage" | "autre"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "employee"],
      photo_phase: ["avant", "pendant", "apres"],
      repair_status: [
        "recu",
        "diagnostic",
        "attente_validation",
        "attente_piece",
        "en_reparation",
        "tests",
        "termine",
        "restitue",
        "annule",
      ],
      rule_category: ["esthetique", "technique", "blocage", "autre"],
    },
  },
} as const
