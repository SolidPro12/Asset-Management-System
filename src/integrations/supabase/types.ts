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
      asset_activity_log: {
        Row: {
          activity_type: string
          asset_id: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          performed_by: string | null
        }
        Insert: {
          activity_type: string
          asset_id: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
        }
        Update: {
          activity_type?: string
          asset_id?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_activity_log_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_allocations: {
        Row: {
          allocated_by: string | null
          allocated_date: string
          asset_id: string | null
          asset_name: string
          category: Database["public"]["Enums"]["asset_category"]
          condition: string
          created_at: string
          department: string | null
          employee_id: string | null
          employee_name: string
          id: string
          notes: string | null
          return_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          allocated_by?: string | null
          allocated_date?: string
          asset_id?: string | null
          asset_name: string
          category: Database["public"]["Enums"]["asset_category"]
          condition?: string
          created_at?: string
          department?: string | null
          employee_id?: string | null
          employee_name: string
          id?: string
          notes?: string | null
          return_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          allocated_by?: string | null
          allocated_date?: string
          asset_id?: string | null
          asset_name?: string
          category?: Database["public"]["Enums"]["asset_category"]
          condition?: string
          created_at?: string
          department?: string | null
          employee_id?: string | null
          employee_name?: string
          id?: string
          notes?: string | null
          return_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_allocations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_allocations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_history: {
        Row: {
          asset_id: string
          assigned_by: string | null
          assigned_date: string
          assigned_to: string
          created_at: string
          id: string
          notes: string | null
          return_date: string | null
        }
        Insert: {
          asset_id: string
          assigned_by?: string | null
          assigned_date?: string
          assigned_to: string
          created_at?: string
          id?: string
          notes?: string | null
          return_date?: string | null
        }
        Update: {
          asset_id?: string
          assigned_by?: string | null
          assigned_date?: string
          assigned_to?: string
          created_at?: string
          id?: string
          notes?: string | null
          return_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          category: Database["public"]["Enums"]["asset_category"]
          created_at: string
          department: string | null
          employment_type: string | null
          expected_delivery_date: string | null
          id: string
          location: string | null
          notes: string | null
          quantity: number
          reason: string
          rejection_reason: string | null
          request_id: string | null
          request_type: Database["public"]["Enums"]["request_type"]
          requester_id: string
          specification: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category: Database["public"]["Enums"]["asset_category"]
          created_at?: string
          department?: string | null
          employment_type?: string | null
          expected_delivery_date?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          quantity?: number
          reason: string
          rejection_reason?: string | null
          request_id?: string | null
          request_type?: Database["public"]["Enums"]["request_type"]
          requester_id: string
          specification?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category?: Database["public"]["Enums"]["asset_category"]
          created_at?: string
          department?: string | null
          employment_type?: string | null
          expected_delivery_date?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          quantity?: number
          reason?: string
          rejection_reason?: string | null
          request_id?: string | null
          request_type?: Database["public"]["Enums"]["request_type"]
          requester_id?: string
          specification?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          asset_name: string
          asset_tag: string
          brand: string | null
          category: Database["public"]["Enums"]["asset_category"]
          created_at: string
          created_by: string | null
          current_assignee_id: string | null
          department: string | null
          id: string
          location: string | null
          model: string | null
          notes: string | null
          purchase_cost: number | null
          purchase_date: string | null
          serial_number: string | null
          specifications: Json | null
          status: Database["public"]["Enums"]["asset_status"]
          updated_at: string
          warranty_end_date: string | null
        }
        Insert: {
          asset_name: string
          asset_tag: string
          brand?: string | null
          category: Database["public"]["Enums"]["asset_category"]
          created_at?: string
          created_by?: string | null
          current_assignee_id?: string | null
          department?: string | null
          id?: string
          location?: string | null
          model?: string | null
          notes?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          serial_number?: string | null
          specifications?: Json | null
          status?: Database["public"]["Enums"]["asset_status"]
          updated_at?: string
          warranty_end_date?: string | null
        }
        Update: {
          asset_name?: string
          asset_tag?: string
          brand?: string | null
          category?: Database["public"]["Enums"]["asset_category"]
          created_at?: string
          created_by?: string | null
          current_assignee_id?: string | null
          department?: string | null
          id?: string
          location?: string | null
          model?: string | null
          notes?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          serial_number?: string | null
          specifications?: Json | null
          status?: Database["public"]["Enums"]["asset_status"]
          updated_at?: string
          warranty_end_date?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string
          employee_id: string | null
          full_name: string
          id: string
          is_department_head: boolean | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          employee_id?: string | null
          full_name: string
          id: string
          is_department_head?: boolean | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          employee_id?: string | null
          full_name?: string
          id?: string
          is_department_head?: boolean | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      request_history: {
        Row: {
          action: string
          created_at: string
          id: string
          performed_by: string | null
          remarks: string | null
          request_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          performed_by?: string | null
          remarks?: string | null
          request_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          performed_by?: string | null
          remarks?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "asset_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_history: {
        Row: {
          asset_id: string
          cost: number | null
          created_at: string
          description: string | null
          id: string
          notes: string | null
          performed_by: string | null
          service_date: string
          service_type: string
          vendor: string | null
        }
        Insert: {
          asset_id: string
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          service_date: string
          service_type: string
          vendor?: string | null
        }
        Update: {
          asset_id?: string
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          service_date?: string
          service_type?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_history: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          remarks: string | null
          ticket_id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          remarks?: string | null
          ticket_id: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          remarks?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          asset_id: string | null
          asset_name: string
          assigned_to: string | null
          attachments: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          department: string
          description: string
          id: string
          issue_category: Database["public"]["Enums"]["issue_category"]
          location: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_id: string
          title: string
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          asset_name: string
          assigned_to?: string | null
          attachments?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          department: string
          description: string
          id?: string
          issue_category: Database["public"]["Enums"]["issue_category"]
          location: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_id: string
          title: string
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          asset_name?: string
          assigned_to?: string | null
          attachments?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          department?: string
          description?: string
          id?: string
          issue_category?: Database["public"]["Enums"]["issue_category"]
          location?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_log: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["activity_type"]
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_type"]
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      generate_request_id: { Args: never; Returns: string }
      generate_ticket_id: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      activity_type:
        | "login"
        | "logout"
        | "ticket_created"
        | "ticket_updated"
        | "asset_viewed"
        | "asset_assigned"
        | "asset_returned"
        | "asset_status_changed"
        | "asset_location_changed"
        | "profile_updated"
        | "service_added"
        | "request_created"
        | "request_updated"
      app_role:
        | "super_admin"
        | "admin"
        | "hr"
        | "user"
        | "financer"
        | "department_head"
      asset_category:
        | "laptop"
        | "desktop"
        | "monitor"
        | "keyboard"
        | "mouse"
        | "headset"
        | "printer"
        | "phone"
        | "tablet"
        | "other"
      asset_status: "available" | "assigned" | "under_maintenance" | "retired"
      issue_category: "hardware" | "software" | "network" | "access"
      request_status:
        | "pending"
        | "approved"
        | "rejected"
        | "in_progress"
        | "completed"
        | "cancelled"
      request_type: "regular" | "urgent" | "express"
      ticket_priority: "low" | "medium" | "high" | "critical"
      ticket_status: "open" | "in_progress" | "resolved" | "closed" | "on_hold"
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
      activity_type: [
        "login",
        "logout",
        "ticket_created",
        "ticket_updated",
        "asset_viewed",
        "asset_assigned",
        "asset_returned",
        "asset_status_changed",
        "asset_location_changed",
        "profile_updated",
        "service_added",
        "request_created",
        "request_updated",
      ],
      app_role: [
        "super_admin",
        "admin",
        "hr",
        "user",
        "financer",
        "department_head",
      ],
      asset_category: [
        "laptop",
        "desktop",
        "monitor",
        "keyboard",
        "mouse",
        "headset",
        "printer",
        "phone",
        "tablet",
        "other",
      ],
      asset_status: ["available", "assigned", "under_maintenance", "retired"],
      issue_category: ["hardware", "software", "network", "access"],
      request_status: [
        "pending",
        "approved",
        "rejected",
        "in_progress",
        "completed",
        "cancelled",
      ],
      request_type: ["regular", "urgent", "express"],
      ticket_priority: ["low", "medium", "high", "critical"],
      ticket_status: ["open", "in_progress", "resolved", "closed", "on_hold"],
    },
  },
} as const
