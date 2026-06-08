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
      analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          product_id: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          product_id?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          product_id?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          created_at: string
          description: string
          id: string
          name: string
          price: number
          primary_image_url: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          name: string
          price?: number
          primary_image_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          name?: string
          price?: number
          primary_image_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          id: string
          created_at: string
          user_id: string | null
          produto_nome: string
          produto_preco: number
          cliente_nome: string
          cliente_cpf: string
          cliente_telefone: string
          endereco_rua: string
          endereco_numero: string
          endereco_bairro: string
          endereco_cidade: string
          endereco_estado: string
          endereco_cep: string
          status: string
          mensagem_whatsapp: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id?: string | null
          produto_nome: string
          produto_preco?: number
          cliente_nome: string
          cliente_cpf: string
          cliente_telefone: string
          endereco_rua: string
          endereco_numero: string
          endereco_bairro: string
          endereco_cidade: string
          endereco_estado?: string
          endereco_cep: string
          status?: string
          mensagem_whatsapp?: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string | null
          produto_nome?: string
          produto_preco?: number
          cliente_nome?: string
          cliente_cpf?: string
          cliente_telefone?: string
          endereco_rua?: string
          endereco_numero?: string
          endereco_bairro?: string
          endereco_cidade?: string
          endereco_estado?: string
          endereco_cep?: string
          status?: string
          mensagem_whatsapp?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          nome: string
          telefone: string
          created_at: string
        }
        Insert: {
          id: string
          nome?: string
          telefone?: string
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          telefone?: string
          created_at?: string
        }
        Relationships: []
      }
      pharpep_products: {
        Row: {
          id: string
          created_at: string
          name: string
          description: string
          price: number
          primary_image_url: string | null
          active: boolean
          sort_order: number
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          description?: string
          price: number
          primary_image_url?: string | null
          active?: boolean
          sort_order?: number
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          description?: string
          price?: number
          primary_image_url?: string | null
          active?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      financas: {
        Row: {
          id: string
          created_at: string
          data: string
          descricao: string
          valor: number
          tipo: string
        }
        Insert: {
          id?: string
          created_at?: string
          data?: string
          descricao: string
          valor: number
          tipo: string
        }
        Update: {
          id?: string
          created_at?: string
          data?: string
          descricao?: string
          valor?: number
          tipo?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          id: string
          created_at: string
          cliente_nome: string
          cliente_cpf: string
          cliente_telefone: string
          endereco_rua: string
          endereco_numero: string
          endereco_bairro: string
          endereco_cidade: string
          endereco_estado: string
          endereco_cep: string
          produto: string
          valor: number
          status: string
          observacoes: string
        }
        Insert: {
          id?: string
          created_at?: string
          cliente_nome: string
          cliente_cpf: string
          cliente_telefone: string
          endereco_rua: string
          endereco_numero: string
          endereco_bairro: string
          endereco_cidade: string
          endereco_estado?: string
          endereco_cep: string
          produto: string
          valor?: number
          status?: string
          observacoes?: string
        }
        Update: {
          id?: string
          created_at?: string
          cliente_nome?: string
          cliente_cpf?: string
          cliente_telefone?: string
          endereco_rua?: string
          endereco_numero?: string
          endereco_bairro?: string
          endereco_cidade?: string
          endereco_estado?: string
          endereco_cep?: string
          produto?: string
          valor?: number
          status?: string
          observacoes?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      create_pharpep_user: {
        Args: {
          p_nome: string
          p_telefone: string
          p_password: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
