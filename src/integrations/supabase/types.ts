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
      alum_profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string
          function: string | null
          graduation_year: number | null
          id: string
          linkedin_url: string | null
          name: string | null
          phone: string | null
          program: string | null
          seniority: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          function?: string | null
          graduation_year?: number | null
          id: string
          linkedin_url?: string | null
          name?: string | null
          phone?: string | null
          program?: string | null
          seniority?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          function?: string | null
          graduation_year?: number | null
          id?: string
          linkedin_url?: string | null
          name?: string | null
          phone?: string | null
          program?: string | null
          seniority?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alum_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
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
            referencedRelation: "job_seeker_profile_for_alum"
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
          logo_url: string | null
          monitoring_method: string
          name: string
        }
        Insert: {
          active?: boolean
          ats_feed_url?: string | null
          ats_type: Database["public"]["Enums"]["ats_type_enum"]
          created_at?: string
          id?: string
          logo_url?: string | null
          monitoring_method?: string
          name: string
        }
        Update: {
          active?: boolean
          ats_feed_url?: string | null
          ats_type?: Database["public"]["Enums"]["ats_type_enum"]
          created_at?: string
          id?: string
          logo_url?: string | null
          monitoring_method?: string
          name?: string
        }
        Relationships: []
      }
      connection_requests: {
        Row: {
          alum_id: string
          id: string
          job_seeker_id: string
          outcome: string | null
          outcome_reported_at: string | null
          requested_at: string
          responded_at: string | null
          status: Database["public"]["Enums"]["connection_status_enum"]
        }
        Insert: {
          alum_id: string
          id?: string
          job_seeker_id: string
          outcome?: string | null
          outcome_reported_at?: string | null
          requested_at?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["connection_status_enum"]
        }
        Update: {
          alum_id?: string
          id?: string
          job_seeker_id?: string
          outcome?: string | null
          outcome_reported_at?: string | null
          requested_at?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["connection_status_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "connection_requests_alum_id_fkey"
            columns: ["alum_id"]
            isOneToOne: false
            referencedRelation: "alum_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_requests_alum_id_fkey"
            columns: ["alum_id"]
            isOneToOne: false
            referencedRelation: "alum_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_requests_job_seeker_id_fkey"
            columns: ["job_seeker_id"]
            isOneToOne: false
            referencedRelation: "job_seeker_profile_for_alum"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_requests_job_seeker_id_fkey"
            columns: ["job_seeker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          description: string | null
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
          description?: string | null
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
          description?: string | null
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
      user_target_roles: {
        Row: {
          created_at: string
          function: string
          id: string
          level: string
          user_id: string
        }
        Insert: {
          created_at?: string
          function: string
          id?: string
          level: string
          user_id: string
        }
        Update: {
          created_at?: string
          function?: string
          id?: string
          level?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_target_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "job_seeker_profile_for_alum"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_target_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_work_experience: {
        Row: {
          company_name: string
          created_at: string
          end_date: string | null
          id: string
          role_title: string
          start_date: string | null
          user_id: string
        }
        Insert: {
          company_name: string
          created_at?: string
          end_date?: string | null
          id?: string
          role_title: string
          start_date?: string | null
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string
          end_date?: string | null
          id?: string
          role_title?: string
          start_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_work_experience_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "job_seeker_profile_for_alum"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_work_experience_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          graduation_year: number | null
          id: string
          kellogg_email: string
          name: string | null
          program: string | null
          target_function: string | null
          target_level: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          graduation_year?: number | null
          id: string
          kellogg_email: string
          name?: string | null
          program?: string | null
          target_function?: string | null
          target_level?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          graduation_year?: number | null
          id?: string
          kellogg_email?: string
          name?: string | null
          program?: string | null
          target_function?: string | null
          target_level?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      alum_contact_unlocked: {
        Row: {
          alum_id: string | null
          email: string | null
          phone: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connection_requests_alum_id_fkey"
            columns: ["alum_id"]
            isOneToOne: false
            referencedRelation: "alum_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_requests_alum_id_fkey"
            columns: ["alum_id"]
            isOneToOne: false
            referencedRelation: "alum_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alum_directory: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          function: string | null
          graduation_year: number | null
          id: string | null
          linkedin_url: string | null
          name: string | null
          program: string | null
          seniority: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          function?: string | null
          graduation_year?: number | null
          id?: string | null
          linkedin_url?: string | null
          name?: string | null
          program?: string | null
          seniority?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          function?: string | null
          graduation_year?: number | null
          id?: string | null
          linkedin_url?: string | null
          name?: string | null
          program?: string | null
          seniority?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alum_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_requests_for_alum: {
        Row: {
          id: string | null
          job_seeker_id: string | null
          job_seeker_name: string | null
          outcome: string | null
          requested_at: string | null
          responded_at: string | null
          status: Database["public"]["Enums"]["connection_status_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "connection_requests_job_seeker_id_fkey"
            columns: ["job_seeker_id"]
            isOneToOne: false
            referencedRelation: "job_seeker_profile_for_alum"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_requests_job_seeker_id_fkey"
            columns: ["job_seeker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      job_seeker_experience_for_alum: {
        Row: {
          company_name: string | null
          end_date: string | null
          id: string | null
          role_title: string | null
          start_date: string | null
          user_id: string | null
        }
        Insert: {
          company_name?: string | null
          end_date?: string | null
          id?: string | null
          role_title?: string | null
          start_date?: string | null
          user_id?: string | null
        }
        Update: {
          company_name?: string | null
          end_date?: string | null
          id?: string | null
          role_title?: string | null
          start_date?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_work_experience_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "job_seeker_profile_for_alum"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_work_experience_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      job_seeker_profile_for_alum: {
        Row: {
          avatar_url: string | null
          graduation_year: number | null
          id: string | null
          name: string | null
          program: string | null
          target_function: string | null
          target_level: string | null
        }
        Relationships: []
      }
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
      connection_status_enum: "pending" | "accepted" | "declined"
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
      connection_status_enum: ["pending", "accepted", "declined"],
    },
  },
} as const
