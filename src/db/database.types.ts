export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      generation_error_logs: {
        Row: {
          correlation_id: string | null;
          created_at: string;
          error_code: string;
          error_message: string;
          id: number;
          model: string;
          request_id: string;
          resolution_note: string | null;
          resolved_at: string | null;
          severity: "debug" | "info" | "warning" | "error" | "critical";
          source_text_hash: string;
          source_text_length: number;
          user_id: string;
        };
        Insert: {
          correlation_id?: string | null;
          created_at?: string;
          error_code: string;
          error_message: string;
          id?: number;
          model: string;
          request_id?: string;
          resolution_note?: string | null;
          resolved_at?: string | null;
          severity?: "debug" | "info" | "warning" | "error" | "critical";
          source_text_hash: string;
          source_text_length: number;
          user_id: string;
        };
        Update: {
          correlation_id?: string | null;
          created_at?: string;
          error_code?: string;
          error_message?: string;
          id?: number;
          model?: string;
          request_id?: string;
          resolution_note?: string | null;
          resolved_at?: string | null;
          severity?: "debug" | "info" | "warning" | "error" | "critical";
          source_text_hash?: string;
          source_text_length?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      mood_entries: {
        Row: {
          ai_helpful: boolean | null;
          ai_response: string | null;
          created_at: string;
          id: number;
          note: string | null;
          score: number;
          tags: (
            | "work"
            | "stress"
            | "sleep"
            | "energy"
            | "family"
            | "health"
            | "motivation"
            | "rest"
            | "relationships"
            | "social"
            | "study"
            | "diet"
          )[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          ai_helpful?: boolean | null;
          ai_response?: string | null;
          created_at?: string;
          id?: number;
          note?: string | null;
          score: number;
          tags?: (
            | "work"
            | "stress"
            | "sleep"
            | "energy"
            | "family"
            | "health"
            | "motivation"
            | "rest"
            | "relationships"
            | "social"
            | "study"
            | "diet"
          )[];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          ai_helpful?: boolean | null;
          ai_response?: string | null;
          created_at?: string;
          id?: number;
          note?: string | null;
          score?: number;
          tags?: (
            | "work"
            | "stress"
            | "sleep"
            | "energy"
            | "family"
            | "health"
            | "motivation"
            | "rest"
            | "relationships"
            | "social"
            | "study"
            | "diet"
          )[];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      users_profile: {
        Row: {
          created_at: string;
          id: string;
          ritual_time: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          ritual_time?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          ritual_time?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
