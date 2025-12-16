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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      block_access: {
        Row: {
          block_id: string
          granted_at: string
          granted_by: string
          user_id: string
        }
        Insert: {
          block_id: string
          granted_at?: string
          granted_by: string
          user_id: string
        }
        Update: {
          block_id?: string
          granted_at?: string
          granted_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_access_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      block_diffs: {
        Row: {
          child_block_id: string
          child_version_id: string | null
          created_at: string
          diff: Json
          id: string
          parent_block_id: string
          parent_version_id: string | null
        }
        Insert: {
          child_block_id: string
          child_version_id?: string | null
          created_at?: string
          diff: Json
          id?: string
          parent_block_id: string
          parent_version_id?: string | null
        }
        Update: {
          child_block_id?: string
          child_version_id?: string | null
          created_at?: string
          diff?: Json
          id?: string
          parent_block_id?: string
          parent_version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "block_diffs_child_block_id_fkey"
            columns: ["child_block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_diffs_child_version_id_fkey"
            columns: ["child_version_id"]
            isOneToOne: false
            referencedRelation: "block_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_diffs_parent_block_id_fkey"
            columns: ["parent_block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_diffs_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "block_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      block_invite_events: {
        Row: {
          block_id: string
          created_at: string
          id: string
          invited_by: string
          invited_user_id: string
        }
        Insert: {
          block_id: string
          created_at?: string
          id?: string
          invited_by: string
          invited_user_id: string
        }
        Update: {
          block_id?: string
          created_at?: string
          id?: string
          invited_by?: string
          invited_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_invite_events_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      block_likes: {
        Row: {
          block_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          block_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          block_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_likes_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      block_smart: {
        Row: {
          block_id: string
          cached_at: string | null
          cached_payload: Json | null
          config: Json
          last_error: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_status: string
          requires_auth: boolean
          updated_at: string
        }
        Insert: {
          block_id: string
          cached_at?: string | null
          cached_payload?: Json | null
          config?: Json
          last_error?: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_status?: string
          requires_auth?: boolean
          updated_at?: string
        }
        Update: {
          block_id?: string
          cached_at?: string | null
          cached_payload?: Json | null
          config?: Json
          last_error?: string | null
          provider?: Database["public"]["Enums"]["integration_provider"]
          refresh_status?: string
          requires_auth?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_smart_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: true
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      block_tags: {
        Row: {
          block_id: string
          created_at: string
          tag_id: number
        }
        Insert: {
          block_id: string
          created_at?: string
          tag_id: number
        }
        Update: {
          block_id?: string
          created_at?: string
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "block_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      block_templates: {
        Row: {
          block_id: string
          last_error: string | null
          line_count: number
          skeleton_sig: string
          skeleton_text: string
          skeleton_version: number
          slot_count: number
          status: string
          updated_at: string
        }
        Insert: {
          block_id: string
          last_error?: string | null
          line_count?: number
          skeleton_sig: string
          skeleton_text: string
          skeleton_version?: number
          slot_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          block_id?: string
          last_error?: string | null
          line_count?: number
          skeleton_sig?: string
          skeleton_text?: string
          skeleton_version?: number
          slot_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_templates_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: true
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      block_versions: {
        Row: {
          block_id: string
          content: string
          created_at: string
          id: string
          meta: Json
          title: string | null
          version_num: number
        }
        Insert: {
          block_id: string
          content: string
          created_at?: string
          id?: string
          meta?: Json
          title?: string | null
          version_num: number
        }
        Update: {
          block_id?: string
          content?: string
          created_at?: string
          id?: string
          meta?: Json
          title?: string | null
          version_num?: number
        }
        Relationships: [
          {
            foreignKeyName: "block_versions_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          ai_tag_suggestions: Json
          category_id: number | null
          content: string
          content_fingerprint: string | null
          created_at: string
          draft_visibility: string | null
          has_smart: boolean
          id: string
          is_pinned: boolean
          is_posted: boolean
          origin_template_block_id: string | null
          owner_id: string
          pinned_order: number | null
          posted_at: string | null
          search_tsv: unknown
          status: string
          title: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          ai_tag_suggestions?: Json
          category_id?: number | null
          content: string
          content_fingerprint?: string | null
          created_at?: string
          draft_visibility?: string | null
          has_smart?: boolean
          id?: string
          is_pinned?: boolean
          is_posted?: boolean
          origin_template_block_id?: string | null
          owner_id: string
          pinned_order?: number | null
          posted_at?: string | null
          search_tsv?: unknown
          status?: string
          title?: string | null
          updated_at?: string
          visibility: string
        }
        Update: {
          ai_tag_suggestions?: Json
          category_id?: number | null
          content?: string
          content_fingerprint?: string | null
          created_at?: string
          draft_visibility?: string | null
          has_smart?: boolean
          id?: string
          is_pinned?: boolean
          is_posted?: boolean
          origin_template_block_id?: string | null
          owner_id?: string
          pinned_order?: number | null
          posted_at?: string | null
          search_tsv?: unknown
          status?: string
          title?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_origin_template_fkey"
            columns: ["origin_template_block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          name: string
          slug: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: number
          is_active?: boolean
          name: string
          slug?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: number
          is_active?: boolean
          name?: string
          slug?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      library_items: {
        Row: {
          category_id: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          tags_text: string[]
          template_block_id: string
          title: string
        }
        Insert: {
          category_id: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          tags_text?: string[]
          template_block_id: string
          title: string
        }
        Update: {
          category_id?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          tags_text?: string[]
          template_block_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      library_promotion_events: {
        Row: {
          admin_user_id: string | null
          best_match_library_item_id: string | null
          best_match_score: number | null
          best_match_template_block_id: string | null
          created_at: string
          created_library_item_id: string | null
          duplicate_of_library_item_id: string | null
          id: string
          note: string | null
          outcome: string
          requested_category_id: number | null
          skeleton_sig: string | null
          source_block_id: string
        }
        Insert: {
          admin_user_id?: string | null
          best_match_library_item_id?: string | null
          best_match_score?: number | null
          best_match_template_block_id?: string | null
          created_at?: string
          created_library_item_id?: string | null
          duplicate_of_library_item_id?: string | null
          id?: string
          note?: string | null
          outcome: string
          requested_category_id?: number | null
          skeleton_sig?: string | null
          source_block_id: string
        }
        Update: {
          admin_user_id?: string | null
          best_match_library_item_id?: string | null
          best_match_score?: number | null
          best_match_template_block_id?: string | null
          created_at?: string
          created_library_item_id?: string | null
          duplicate_of_library_item_id?: string | null
          id?: string
          note?: string | null
          outcome?: string
          requested_category_id?: number | null
          skeleton_sig?: string | null
          source_block_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_promotion_events_created_library_item_id_fkey"
            columns: ["created_library_item_id"]
            isOneToOne: false
            referencedRelation: "library_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_promotion_events_created_library_item_id_fkey"
            columns: ["created_library_item_id"]
            isOneToOne: false
            referencedRelation: "library_template_stats"
            referencedColumns: ["library_item_id"]
          },
          {
            foreignKeyName: "library_promotion_events_duplicate_of_library_item_id_fkey"
            columns: ["duplicate_of_library_item_id"]
            isOneToOne: false
            referencedRelation: "library_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_promotion_events_duplicate_of_library_item_id_fkey"
            columns: ["duplicate_of_library_item_id"]
            isOneToOne: false
            referencedRelation: "library_template_stats"
            referencedColumns: ["library_item_id"]
          },
          {
            foreignKeyName: "library_promotion_events_requested_category_id_fkey"
            columns: ["requested_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_promotion_events_source_block_id_fkey"
            columns: ["source_block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      remix_edges: {
        Row: {
          child_block_id: string
          created_at: string
          id: string
          parent_block_id: string
          parent_version_id: string | null
        }
        Insert: {
          child_block_id: string
          created_at?: string
          id?: string
          parent_block_id: string
          parent_version_id?: string | null
        }
        Update: {
          child_block_id?: string
          created_at?: string
          id?: string
          parent_block_id?: string
          parent_version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "remix_edges_child_block_id_fkey"
            columns: ["child_block_id"]
            isOneToOne: true
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remix_edges_parent_block_id_fkey"
            columns: ["parent_block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remix_edges_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "block_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      reserved_handles: {
        Row: {
          category: string
          created_at: string
          handle: string
          note: string | null
        }
        Insert: {
          category: string
          created_at?: string
          handle: string
          note?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          handle?: string
          note?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: number
          name: string
          name_norm: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          name_norm?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          name_norm?: string | null
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          access_token: string | null
          created_at: string
          id: string
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token: string | null
          scopes: string[]
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          id?: string
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token?: string | null
          scopes?: string[]
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          id?: string
          provider?: Database["public"]["Enums"]["integration_provider"]
          refresh_token?: string | null
          scopes?: string[]
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bg_style: string
          created_at: string
          handle: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bg_style?: string
          created_at?: string
          handle: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bg_style?: string
          created_at?: string
          handle?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      library_template_stats: {
        Row: {
          category_id: number | null
          library_created_at: string | null
          library_item_id: string | null
          like_count_all_time: number | null
          popular_score_7d: number | null
          remix_count_all_time: number | null
          template_block_id: string | null
          template_usage_24h: number | null
          template_usage_7d: number | null
          template_usage_all_time: number | null
          title: string | null
          trending_score_24h: number | null
        }
        Insert: {
          category_id?: number | null
          library_created_at?: string | null
          library_item_id?: string | null
          like_count_all_time?: never
          popular_score_7d?: never
          remix_count_all_time?: never
          template_block_id?: string | null
          template_usage_24h?: never
          template_usage_7d?: never
          template_usage_all_time?: never
          title?: string | null
          trending_score_24h?: never
        }
        Update: {
          category_id?: number | null
          library_created_at?: string | null
          library_item_id?: string | null
          like_count_all_time?: never
          popular_score_7d?: never
          remix_count_all_time?: never
          template_block_id?: string | null
          template_usage_24h?: never
          template_usage_7d?: never
          template_usage_all_time?: never
          title?: string | null
          trending_score_24h?: never
        }
        Relationships: [
          {
            foreignKeyName: "library_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      integration_provider: "spotify" | "fortnite"
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
      integration_provider: ["spotify", "fortnite"],
    },
  },
} as const
