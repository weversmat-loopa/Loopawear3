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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      designs: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          image_status: string
          image_url: string | null
          placement: Json | null
          price_cents: number | null
          product_type: string | null
          prompt: string
          status: string
          style: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          image_status?: string
          image_url?: string | null
          placement?: Json | null
          price_cents?: number | null
          product_type?: string | null
          prompt: string
          status?: string
          style?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          image_status?: string
          image_url?: string | null
          placement?: Json | null
          price_cents?: number | null
          product_type?: string | null
          prompt?: string
          status?: string
          style?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_total_cents: number
          buyer_id: string | null
          created_at: string
          creator_earnings_cents: number
          creator_id: string | null
          currency: string
          design_id: string
          fulfillment_notes: string | null
          id: string
          paid_at: string
          platform_fee_cents: number
          quantity: number
          shipped_at: string | null
          shipping_city: string
          shipping_country: string
          shipping_line1: string
          shipping_line2: string | null
          shipping_name: string
          shipping_postal_code: string
          shipping_state: string | null
          size: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string
          tracking_number: string | null
          unit_price_cents: number
        }
        Insert: {
          amount_total_cents: number
          buyer_id?: string | null
          created_at?: string
          creator_earnings_cents: number
          creator_id?: string | null
          currency?: string
          design_id: string
          fulfillment_notes?: string | null
          id?: string
          paid_at?: string
          platform_fee_cents: number
          quantity: number
          shipped_at?: string | null
          shipping_city: string
          shipping_country: string
          shipping_line1: string
          shipping_line2?: string | null
          shipping_name: string
          shipping_postal_code: string
          shipping_state?: string | null
          size: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id: string
          tracking_number?: string | null
          unit_price_cents: number
        }
        Update: {
          amount_total_cents?: number
          buyer_id?: string | null
          created_at?: string
          creator_earnings_cents?: number
          creator_id?: string | null
          currency?: string
          design_id?: string
          fulfillment_notes?: string | null
          id?: string
          paid_at?: string
          platform_fee_cents?: number
          quantity?: number
          shipped_at?: string | null
          shipping_city?: string
          shipping_country?: string
          shipping_line1?: string
          shipping_line2?: string | null
          shipping_name?: string
          shipping_postal_code?: string
          shipping_state?: string | null
          size?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string
          tracking_number?: string | null
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          generation_credits: number
          id: string
          role: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          generation_credits?: number
          id: string
          role?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          generation_credits?: number
          id?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          bio: string | null
          display_name: string | null
          id: string | null
        }
        Insert: {
          bio?: string | null
          display_name?: string | null
          id?: string | null
        }
        Update: {
          bio?: string | null
          display_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      decrement_generation_credits: {
        Args: { user_id: string }
        Returns: number
      }
      increment_generation_credits: {
        Args: { user_id: string }
        Returns: undefined
      }
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
