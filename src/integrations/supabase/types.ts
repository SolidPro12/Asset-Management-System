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
          action: string | null
          action_date: string | null
          asset_code: string | null
          asset_id: string
          asset_name: string | null
          assigned_by: string | null
          assigned_date: string
          assigned_to: string
          category: string | null
          condition: string | null
          created_at: string
          details: string | null
          id: string
          notes: string | null
          performed_by_email: string | null
          return_date: string | null
        }
        Insert: {
          action?: string | null
          action_date?: string | null
          asset_code?: string | null
          asset_id: string
          asset_name?: string | null
          assigned_by?: string | null
          assigned_date?: string
          assigned_to: string
          category?: string | null
          condition?: string | null
          created_at?: string
          details?: string | null
          id?: string
          notes?: string | null
          performed_by_email?: string | null
          return_date?: string | null
        }
        Update: {
          action?: string | null
          action_date?: string | null
          asset_code?: string | null
          asset_id?: string
          asset_name?: string | null
          assigned_by?: string | null
          assigned_date?: string
          assigned_to?: string
          category?: string | null
          condition?: string | null
          created_at?: string
          details?: string | null
          id?: string
          notes?: string | null
          performed_by_email?: string | null
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
      asset_transfers: {
        Row: {
          asset_id: string
          asset_name: string
          completed_at: string | null
          created_at: string
          from_user_approved: boolean | null
          from_user_approved_at: string | null
          from_user_id: string | null
          from_user_name: string | null
          id: string
          initiated_at: string
          initiated_by: string
          notes: string | null
          status: string
          to_user_approved: boolean | null
          to_user_approved_at: string | null
          to_user_id: string
          to_user_name: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          asset_name: string
          completed_at?: string | null
          created_at?: string
          from_user_approved?: boolean | null
          from_user_approved_at?: string | null
          from_user_id?: string | null
          from_user_name?: string | null
          id?: string
          initiated_at?: string
          initiated_by: string
          notes?: string | null
          status?: string
          to_user_approved?: boolean | null
          to_user_approved_at?: string | null
          to_user_id: string
          to_user_name: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          asset_name?: string
          completed_at?: string | null
          created_at?: string
          from_user_approved?: boolean | null
          from_user_approved_at?: string | null
          from_user_id?: string | null
          from_user_name?: string | null
          id?: string
          initiated_at?: string
          initiated_by?: string
          notes?: string | null
          status?: string
          to_user_approved?: boolean | null
          to_user_approved_at?: string | null
          to_user_id?: string
          to_user_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_transfers_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_id: string
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
          asset_id: string
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
          asset_id?: string
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
      maintenance_history: {
        Row: {
          asset_id: string
          asset_name: string
          cost: number | null
          created_at: string
          description: string | null
          id: string
          maintenance_date: string
          maintenance_type: string
          notes: string | null
          performed_by: string | null
          performed_by_name: string | null
          schedule_id: string | null
          vendor: string | null
        }
        Insert: {
          asset_id: string
          asset_name: string
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          maintenance_date: string
          maintenance_type: string
          notes?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          schedule_id?: string | null
          vendor?: string | null
        }
        Update: {
          asset_id?: string
          asset_name?: string
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          maintenance_date?: string
          maintenance_type?: string
          notes?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          schedule_id?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_history_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_history_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_schedules: {
        Row: {
          asset_id: string
          asset_name: string
          assigned_to: string | null
          created_at: string
          created_by: string
          frequency: string
          id: string
          last_maintenance_date: string | null
          maintenance_type: string
          next_maintenance_date: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          asset_name: string
          assigned_to?: string | null
          created_at?: string
          created_by: string
          frequency: string
          id?: string
          last_maintenance_date?: string | null
          maintenance_type: string
          next_maintenance_date: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          asset_name?: string
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          frequency?: string
          id?: string
          last_maintenance_date?: string | null
          maintenance_type?: string
          next_maintenance_date?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_history: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          id: string
          new_department: string | null
          new_role: string | null
          old_department: string | null
          old_role: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_department?: string | null
          new_role?: string | null
          old_department?: string | null
          old_role?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_department?: string | null
          new_role?: string | null
          old_department?: string | null
          old_role?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          deactivated_at: string | null
          deactivated_by: string | null
          department: string | null
          email: string
          employee_id: string | null
          full_name: string
          id: string
          is_active: boolean | null
          is_department_head: boolean | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          department?: string | null
          email: string
          employee_id?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          is_department_head?: boolean | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          department?: string | null
          email?: string
          employee_id?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
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
      settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ticket_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          ticket_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          ticket_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          ticket_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
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
      user_management_log: {
        Row: {
          action_type: string
          created_at: string
          details: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          performed_by: string | null
          target_user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          performed_by?: string | null
          target_user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          performed_by?: string | null
          target_user_id?: string
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
      ticket_status:
        | "open"
        | "in_progress"
        | "resolved"
        | "closed"
        | "on_hold"
        | "cancelled"
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
      ticket_status: [
        "open",
        "in_progress",
        "resolved",
        "closed",
        "on_hold",
        "cancelled",
      ],
    },
  },
} as const
