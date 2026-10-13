
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "equipment": {
                  Row: {
                    "asset_code": string,"brand": string,"created_at": string,"hour_meter": number | null,"id": string,"is_active": boolean,"model": string,"operational_status": Database["public"]['Enums']["equipment_status"],"serial_number": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "asset_code": string,"brand": string,"created_at"?: string,"hour_meter"?: number | null,"id"?: string,"is_active"?: boolean,"model": string,"operational_status"?: Database["public"]['Enums']["equipment_status"],"serial_number"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "asset_code"?: string,"brand"?: string,"created_at"?: string,"hour_meter"?: number | null,"id"?: string,"is_active"?: boolean,"model"?: string,"operational_status"?: Database["public"]['Enums']["equipment_status"],"serial_number"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string | null,"id": string,"is_active": boolean,"role": Database["public"]['Enums']["app_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"full_name"?: string | null,"id": string,"is_active"?: boolean,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string | null,"id"?: string,"is_active"?: boolean,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"work_order_counters": {
                  Row: {
                    "last_value": number,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "last_value": number,"year": number
                  }
                  Update: {
                    "last_value"?: number,"year"?: number
                  }
                  Relationships: [
                    
                  ]
                },"work_order_status_history": {
                  Row: {
                    "changed_at": string,"changed_by": string | null,"id": string,"new_status": Database["public"]['Enums']["work_order_status"],"note": string | null,"previous_status": Database["public"]['Enums']["work_order_status"] | null,"work_order_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_at"?: string,"changed_by"?: string | null,"id"?: string,"new_status": Database["public"]['Enums']["work_order_status"],"note"?: string | null,"previous_status"?: Database["public"]['Enums']["work_order_status"] | null,"work_order_id": string
                  }
                  Update: {
                    "changed_at"?: string,"changed_by"?: string | null,"id"?: string,"new_status"?: Database["public"]['Enums']["work_order_status"],"note"?: string | null,"previous_status"?: Database["public"]['Enums']["work_order_status"] | null,"work_order_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "work_order_status_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "work_order_status_history_work_order_id_fkey"
      columns: ["work_order_id"]
isOneToOne: false
      referencedRelation: "work_orders"
      referencedColumns: ["id"]
    }
                  ]
                },"work_orders": {
                  Row: {
                    "assigned_technician_id": string | null,"created_at": string,"created_by": string | null,"description": string | null,"equipment_id": string,"failure_cause": string | null,"id": string,"labor_cost": number,"parts_cost": number,"priority": Database["public"]['Enums']["work_order_priority"],"reported_at": string,"resolution_notes": string | null,"resolved_at": string | null,"started_at": string | null,"status": Database["public"]['Enums']["work_order_status"],"target_date": string | null,"title": string,"updated_at": string,"work_order_number": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_technician_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"equipment_id": string,"failure_cause"?: string | null,"id"?: string,"labor_cost"?: number,"parts_cost"?: number,"priority"?: Database["public"]['Enums']["work_order_priority"],"reported_at"?: string,"resolution_notes"?: string | null,"resolved_at"?: string | null,"started_at"?: string | null,"status"?: Database["public"]['Enums']["work_order_status"],"target_date"?: string | null,"title": string,"updated_at"?: string,"work_order_number"?: string
                  }
                  Update: {
                    "assigned_technician_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"equipment_id"?: string,"failure_cause"?: string | null,"id"?: string,"labor_cost"?: number,"parts_cost"?: number,"priority"?: Database["public"]['Enums']["work_order_priority"],"reported_at"?: string,"resolution_notes"?: string | null,"resolved_at"?: string | null,"started_at"?: string | null,"status"?: Database["public"]['Enums']["work_order_status"],"target_date"?: string | null,"title"?: string,"updated_at"?: string,"work_order_number"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "work_orders_assigned_technician_id_fkey"
      columns: ["assigned_technician_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "work_orders_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "work_orders_equipment_id_fkey"
      columns: ["equipment_id"]
isOneToOne: false
      referencedRelation: "equipment"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "change_work_order_status":
{ Args: { "p_new_status": Database["public"]['Enums']["work_order_status"],"p_note"?: string,"p_work_order_id": string }; Returns: undefined
                           },
"current_app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["app_role"]
                           },
"is_active_technician":
{ Args: { "p_profile_id": string }; Returns: boolean
                           },
"work_order_transition_allowed":
{ Args: { "p_from": Database["public"]['Enums']["work_order_status"],"p_to": Database["public"]['Enums']["work_order_status"] }; Returns: boolean
                           }
          }
          Enums: {
            "app_role": "admin"|"technician","equipment_status": "available"|"rented"|"in_maintenance"|"out_of_service","work_order_priority": "low"|"medium"|"high"|"critical","work_order_status": "new"|"assigned"|"in_progress"|"waiting_parts"|"waiting_authorization"|"resolved"|"cancelled"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "app_role": ["admin", "technician"],"equipment_status": ["available", "rented", "in_maintenance", "out_of_service"],"work_order_priority": ["low", "medium", "high", "critical"],"work_order_status": ["new", "assigned", "in_progress", "waiting_parts", "waiting_authorization", "resolved", "cancelled"]
          }
        }
} as const
