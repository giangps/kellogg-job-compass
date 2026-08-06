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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      alumni_contacts: {
        Row: {
          company_id: string
          created_at: string
          function: string | null
          id: string
          name: string
          seniority: string | null
          source: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          function?: string | null
          id?: string
          name: string
          seniority?: string | null
          source?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          function?: string | null
          id?: string
          name?: string
          seniority?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alumni_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          date_applied: string
          id: string
          posting_id: string
          user_id: string
        }
        Insert: {
          date_applied?: string
          id?: string
          posting_id: string
          user_id: string
        }
        Update: {
          date_applied?: string
          id?: string
          posting_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_posting_id_fkey"
            columns: ["posting_id"]
            isOneToOne: false
            referencedRelation: "postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          active: boolean
          ats_feed_url: string | null
          ats_type: Database["public"]["Enums"]["ats_type_enum"]
          created_at: string
          id: string
          monitoring_method: string
          name: string
        }
        Insert: {
          active?: boolean
          ats_feed_url?: string | null
          ats_type: Database["public"]["Enums"]["ats_type_enum"]
          created_at?: string
          id?: string
          monitoring_method?: string
          name: string
        }
        Update: {
          active?: boolean
          ats_feed_url?: string | null
          ats_type?: Database["public"]["Enums"]["ats_type_enum"]
          created_at?: string
          id?: string
          monitoring_method?: string
          name?: string
        }
        Relationships: []
      }
      posting_alumni_overlap: {
        Row: {
          id: string
          overlap_count: number
          posting_id: string
        }
        Insert: {
          id?: string
          overlap_count?: number
          posting_id: string
        }
        Update: {
          id?: string
          overlap_count?: number
          posting_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posting_alumni_overlap_posting_id_fkey"
            columns: ["posting_id"]
            isOneToOne: true
            referencedRelation: "postings"
            referencedColumns: ["id"]
          },
        ]
      }
      postings: {
        Row: {
          company_id: string
          created_at: string
          date_posted: string | null
          function_tag: string | null
          id: string
          last_scored_at: string | null
          level_tag: string | null
          location: string | null
          priority_score: number
          source_url: string
          title: string
        }
        Insert: {
          company_id: string
          created_at?: string
          date_posted?: string | null
          function_tag?: string | null
          id?: string
          last_scored_at?: string | null
          level_tag?: string | null
          location?: string | null
          priority_score?: number
          source_url: string
          title: string
        }
        Update: {
          company_id?: string
          created_at?: string
          date_posted?: string | null
          function_tag?: string | null
          id?: string
          last_scored_at?: string | null
          level_tag?: string | null
          location?: string | null
          priority_score?: number
          source_url?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "postings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          graduation_year: number | null
          id: string
          kellogg_email: string
          name: string | null
          target_function: string | null
          target_level: string | null
        }
        Insert: {
          created_at?: string
          graduation_year?: number | null
          id: string
          kellogg_email: string
          name?: string | null
          target_function?: string | null
          target_level?: string | null
        }
        Update: {
          created_at?: string
          graduation_year?: number | null
          id?: string
          kellogg_email?: string
          name?: string | null
          target_function?: string | null
          target_level?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      posting_application_counts: {
        Row: {
          applied_count: number | null
          posting_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_posting_id_fkey"
            columns: ["posting_id"]
            isOneToOne: false
            referencedRelation: "postings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ats_type_enum: "greenhouse" | "lever" | "other"
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
      ats_type_enum: ["greenhouse", "lever", "other"],
    },
  },
} as const
