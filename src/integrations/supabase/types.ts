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
      allocation_presets: {
        Row: {
          buckets: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          buckets?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          buckets?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      bills: {
        Row: {
          amount: number
          category: string
          created_at: string
          due_date: string | null
          id: string
          name: string
          notes: string | null
          paid: boolean
          paid_on: string | null
          priority: string
          recurring: boolean
          recurring_frequency: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          due_date?: string | null
          id?: string
          name: string
          notes?: string | null
          paid?: boolean
          paid_on?: string | null
          priority?: string
          recurring?: boolean
          recurring_frequency?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          due_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          paid?: boolean
          paid_on?: string | null
          priority?: string
          recurring?: boolean
          recurring_frequency?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          calendar_status: string | null
          created_at: string
          description: string | null
          end_time: string | null
          event_type: Database["public"]["Enums"]["calendar_event_type"] | null
          id: string
          job_id: string | null
          location: string | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          calendar_status?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_type?: Database["public"]["Enums"]["calendar_event_type"] | null
          id?: string
          job_id?: string | null
          location?: string | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          calendar_status?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_type?: Database["public"]["Enums"]["calendar_event_type"] | null
          id?: string
          job_id?: string | null
          location?: string | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          customer_type: Database["public"]["Enums"]["customer_type"] | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          preferred_contact:
            | Database["public"]["Enums"]["contact_method"]
            | null
          state: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          preferred_contact?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          preferred_contact?:
            | Database["public"]["Enums"]["contact_method"]
            | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      debt_payments: {
        Row: {
          amount: number
          created_at: string
          debt_id: string
          id: string
          method: string
          notes: string | null
          paid_on: string
        }
        Insert: {
          amount?: number
          created_at?: string
          debt_id: string
          id?: string
          method?: string
          notes?: string | null
          paid_on?: string
        }
        Update: {
          amount?: number
          created_at?: string
          debt_id?: string
          id?: string
          method?: string
          notes?: string | null
          paid_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_payments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          created_at: string
          current_balance: number
          debt_type: string
          due_date: string | null
          id: string
          interest_rate: number | null
          minimum_payment: number
          name: string
          notes: string | null
          paid_off: boolean
          priority: string
          starting_balance: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          debt_type?: string
          due_date?: string | null
          id?: string
          interest_rate?: number | null
          minimum_payment?: number
          name: string
          notes?: string | null
          paid_off?: boolean
          priority?: string
          starting_balance?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          debt_type?: string
          due_date?: string | null
          id?: string
          interest_rate?: number | null
          minimum_payment?: number
          name?: string
          notes?: string | null
          paid_off?: boolean
          priority?: string
          starting_balance?: number
          updated_at?: string
        }
        Relationships: []
      }
      estimates: {
        Row: {
          approved_at: string | null
          created_at: string
          deposit_required: number | null
          id: string
          job_id: string
          labor_price: number | null
          line_items: Json | null
          material_price: number | null
          materials_included: boolean | null
          scope: string | null
          sent_at: string | null
          status: string | null
          terms: string | null
          total_price: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          deposit_required?: number | null
          id?: string
          job_id: string
          labor_price?: number | null
          line_items?: Json | null
          material_price?: number | null
          materials_included?: boolean | null
          scope?: string | null
          sent_at?: string | null
          status?: string | null
          terms?: string | null
          total_price?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          deposit_required?: number | null
          id?: string
          job_id?: string
          labor_price?: number | null
          line_items?: Json | null
          material_price?: number | null
          materials_included?: boolean | null
          scope?: string | null
          sent_at?: string | null
          status?: string | null
          terms?: string | null
          total_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          admin_notes: string | null
          availability: string | null
          city: string | null
          created_at: string
          desired_pay: string | null
          email: string | null
          follows_code: boolean | null
          full_name: string
          has_experience: boolean | null
          has_tools: boolean | null
          has_transport: boolean | null
          id: string
          is_licensed: boolean | null
          notes: string | null
          phone: string
          photo_urls: string[] | null
          skills: string[] | null
          status: string
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          admin_notes?: string | null
          availability?: string | null
          city?: string | null
          created_at?: string
          desired_pay?: string | null
          email?: string | null
          follows_code?: boolean | null
          full_name: string
          has_experience?: boolean | null
          has_tools?: boolean | null
          has_transport?: boolean | null
          id?: string
          is_licensed?: boolean | null
          notes?: string | null
          phone: string
          photo_urls?: string[] | null
          skills?: string[] | null
          status?: string
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          admin_notes?: string | null
          availability?: string | null
          city?: string | null
          created_at?: string
          desired_pay?: string | null
          email?: string | null
          follows_code?: boolean | null
          full_name?: string
          has_experience?: boolean | null
          has_tools?: boolean | null
          has_transport?: boolean | null
          id?: string
          is_licensed?: boolean | null
          notes?: string | null
          phone?: string
          photo_urls?: string[] | null
          skills?: string[] | null
          status?: string
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      job_materials: {
        Row: {
          cost: number
          created_at: string
          description: string
          id: string
          job_id: string
          notes: string | null
          paid_by: string
          purchased_on: string | null
          receipt_url: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          cost?: number
          created_at?: string
          description: string
          id?: string
          job_id: string
          notes?: string | null
          paid_by?: string
          purchased_on?: string | null
          receipt_url?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          cost?: number
          created_at?: string
          description?: string
          id?: string
          job_id?: string
          notes?: string | null
          paid_by?: string
          purchased_on?: string | null
          receipt_url?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: []
      }
      job_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_deposit: boolean
          job_id: string
          method: string
          notes: string | null
          paid_on: string
          receipt_url: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          is_deposit?: boolean
          job_id: string
          method?: string
          notes?: string | null
          paid_on?: string
          receipt_url?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_deposit?: boolean
          job_id?: string
          method?: string
          notes?: string | null
          paid_on?: string
          receipt_url?: string | null
        }
        Relationships: []
      }
      job_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          job_id: string
          photo_type: Database["public"]["Enums"]["photo_type"] | null
          photo_url: string
          uploaded_by_admin: boolean | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          job_id: string
          photo_type?: Database["public"]["Enums"]["photo_type"] | null
          photo_url: string
          uploaded_by_admin?: boolean | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          job_id?: string
          photo_type?: Database["public"]["Enums"]["photo_type"] | null
          photo_url?: string
          uploaded_by_admin?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "job_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_timeline_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          from_status: Database["public"]["Enums"]["job_status"] | null
          id: string
          job_id: string
          note: string | null
          to_status: Database["public"]["Enums"]["job_status"] | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          from_status?: Database["public"]["Enums"]["job_status"] | null
          id?: string
          job_id: string
          note?: string | null
          to_status?: Database["public"]["Enums"]["job_status"] | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          from_status?: Database["public"]["Enums"]["job_status"] | null
          id?: string
          job_id?: string
          note?: string | null
          to_status?: Database["public"]["Enums"]["job_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "job_timeline_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          actual_hours: number | null
          address: string | null
          alternate_date: string | null
          alternate_time_window: string | null
          amount_paid: number | null
          archived: boolean
          balance_due: number | null
          city: string | null
          corrections_needed: string | null
          created_at: string
          customer_id: string
          deposit_paid: number | null
          deposit_required: number | null
          description: string | null
          estimate_amount: number | null
          estimated_hours: number | null
          has_existing_estimate: boolean | null
          has_materials: string | null
          hourly_rate: number | null
          id: string
          inspection_date: string | null
          inspection_needed: Database["public"]["Enums"]["permit_status"] | null
          inspection_notes: string | null
          inspection_status:
            | Database["public"]["Enums"]["inspection_status"]
            | null
          inspection_type: Database["public"]["Enums"]["inspection_type"] | null
          internal_notes: string | null
          job_title: string | null
          job_total: number | null
          job_type: Database["public"]["Enums"]["job_type"]
          labor_amount: number | null
          last_contact: string | null
          materials_cost: number | null
          materials_needed: string | null
          other_expenses: number
          payment_notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          permit_needed: Database["public"]["Enums"]["permit_status"] | null
          permit_number: string | null
          permit_pulled_by: string | null
          power_status: string | null
          preferred_date: string | null
          preferred_time_window: string | null
          priority: number | null
          review_requested: boolean
          review_requested_at: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          state: string | null
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
          urgency: Database["public"]["Enums"]["urgency_level"] | null
          wants_ballpark: boolean | null
          wants_free_estimate: boolean | null
          worker_labor_cost: number
          zip: string | null
        }
        Insert: {
          actual_hours?: number | null
          address?: string | null
          alternate_date?: string | null
          alternate_time_window?: string | null
          amount_paid?: number | null
          archived?: boolean
          balance_due?: number | null
          city?: string | null
          corrections_needed?: string | null
          created_at?: string
          customer_id: string
          deposit_paid?: number | null
          deposit_required?: number | null
          description?: string | null
          estimate_amount?: number | null
          estimated_hours?: number | null
          has_existing_estimate?: boolean | null
          has_materials?: string | null
          hourly_rate?: number | null
          id?: string
          inspection_date?: string | null
          inspection_needed?:
            | Database["public"]["Enums"]["permit_status"]
            | null
          inspection_notes?: string | null
          inspection_status?:
            | Database["public"]["Enums"]["inspection_status"]
            | null
          inspection_type?:
            | Database["public"]["Enums"]["inspection_type"]
            | null
          internal_notes?: string | null
          job_title?: string | null
          job_total?: number | null
          job_type?: Database["public"]["Enums"]["job_type"]
          labor_amount?: number | null
          last_contact?: string | null
          materials_cost?: number | null
          materials_needed?: string | null
          other_expenses?: number
          payment_notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          permit_needed?: Database["public"]["Enums"]["permit_status"] | null
          permit_number?: string | null
          permit_pulled_by?: string | null
          power_status?: string | null
          preferred_date?: string | null
          preferred_time_window?: string | null
          priority?: number | null
          review_requested?: boolean
          review_requested_at?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"] | null
          wants_ballpark?: boolean | null
          wants_free_estimate?: boolean | null
          worker_labor_cost?: number
          zip?: string | null
        }
        Update: {
          actual_hours?: number | null
          address?: string | null
          alternate_date?: string | null
          alternate_time_window?: string | null
          amount_paid?: number | null
          archived?: boolean
          balance_due?: number | null
          city?: string | null
          corrections_needed?: string | null
          created_at?: string
          customer_id?: string
          deposit_paid?: number | null
          deposit_required?: number | null
          description?: string | null
          estimate_amount?: number | null
          estimated_hours?: number | null
          has_existing_estimate?: boolean | null
          has_materials?: string | null
          hourly_rate?: number | null
          id?: string
          inspection_date?: string | null
          inspection_needed?:
            | Database["public"]["Enums"]["permit_status"]
            | null
          inspection_notes?: string | null
          inspection_status?:
            | Database["public"]["Enums"]["inspection_status"]
            | null
          inspection_type?:
            | Database["public"]["Enums"]["inspection_type"]
            | null
          internal_notes?: string | null
          job_title?: string | null
          job_total?: number | null
          job_type?: Database["public"]["Enums"]["job_type"]
          labor_amount?: number | null
          last_contact?: string | null
          materials_cost?: number | null
          materials_needed?: string | null
          other_expenses?: number
          payment_notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          permit_needed?: Database["public"]["Enums"]["permit_status"] | null
          permit_number?: string | null
          permit_pulled_by?: string | null
          power_status?: string | null
          preferred_date?: string | null
          preferred_time_window?: string | null
          priority?: number | null
          review_requested?: boolean
          review_requested_at?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"] | null
          wants_ballpark?: boolean | null
          wants_free_estimate?: boolean | null
          worker_labor_cost?: number
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_projects: {
        Row: {
          after_photos: Json | null
          before_photos: Json | null
          category: Database["public"]["Enums"]["portfolio_category"]
          city: string | null
          cover_image: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          job_id: string | null
          neighborhood: string | null
          permit_inspection_involved: boolean | null
          price_displayed: number | null
          public_visible: boolean | null
          review_id: string | null
          services_performed: string | null
          show_price: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          after_photos?: Json | null
          before_photos?: Json | null
          category: Database["public"]["Enums"]["portfolio_category"]
          city?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          job_id?: string | null
          neighborhood?: string | null
          permit_inspection_involved?: boolean | null
          price_displayed?: number | null
          public_visible?: boolean | null
          review_id?: string | null
          services_performed?: string | null
          show_price?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          after_photos?: Json | null
          before_photos?: Json | null
          category?: Database["public"]["Enums"]["portfolio_category"]
          city?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          job_id?: string | null
          neighborhood?: string | null
          permit_inspection_involved?: boolean | null
          price_displayed?: number | null
          public_visible?: boolean | null
          review_id?: string | null
          services_performed?: string | null
          show_price?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_projects_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projects_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          completed: boolean | null
          created_at: string
          due_date: string
          id: string
          job_id: string | null
          notes: string | null
          reminder_type: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          due_date: string
          id?: string
          job_id?: string | null
          notes?: string | null
          reminder_type: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          due_date?: string
          id?: string
          job_id?: string | null
          notes?: string | null
          reminder_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_name: string | null
          featured: boolean
          id: string
          job_id: string | null
          neighborhood: string | null
          platform: Database["public"]["Enums"]["review_platform"] | null
          public_visible: boolean | null
          rating: number | null
          received_at: string | null
          requested_at: string | null
          review_received: boolean | null
          review_requested: boolean | null
          review_text: string | null
          service_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          featured?: boolean
          id?: string
          job_id?: string | null
          neighborhood?: string | null
          platform?: Database["public"]["Enums"]["review_platform"] | null
          public_visible?: boolean | null
          rating?: number | null
          received_at?: string | null
          requested_at?: string | null
          review_received?: boolean | null
          review_requested?: boolean | null
          review_text?: string | null
          service_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          featured?: boolean
          id?: string
          job_id?: string | null
          neighborhood?: string | null
          platform?: Database["public"]["Enums"]["review_platform"] | null
          public_visible?: boolean | null
          rating?: number | null
          received_at?: string | null
          requested_at?: string | null
          review_received?: boolean | null
          review_requested?: boolean | null
          review_text?: string | null
          service_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
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
      claim_first_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recompute_debt_balance: { Args: { _debt_id: string }; Returns: undefined }
      recompute_job_totals: { Args: { _job_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "staff"
      calendar_event_type:
        | "estimate"
        | "service_call"
        | "rough_in"
        | "trim_out"
        | "panel_upgrade"
        | "service_change"
        | "inspection"
        | "material_pickup"
        | "follow_up"
        | "final_walkthrough"
        | "other"
      contact_method: "call" | "text" | "email"
      customer_type:
        | "homeowner"
        | "landlord"
        | "contractor"
        | "investor"
        | "business"
        | "new_construction"
        | "job_site"
      inspection_status: "pending" | "passed" | "failed" | "not_applicable"
      inspection_type: "rough" | "service" | "final" | "other"
      job_status:
        | "new_lead"
        | "contacted"
        | "estimate_scheduled"
        | "estimate_sent"
        | "approved"
        | "down_payment_needed"
        | "materials_needed"
        | "scheduled"
        | "in_progress"
        | "waiting_on_permit"
        | "waiting_on_inspection"
        | "ready_for_inspection"
        | "inspection_passed"
        | "final_needed"
        | "completed"
        | "paid"
        | "review_requested"
        | "archived"
        | "lost_lead"
        | "cancelled"
      job_type:
        | "electrical_repair"
        | "troubleshooting"
        | "panel_upgrade"
        | "service_change"
        | "lighting_installation"
        | "outlet_switch_gfci"
        | "dedicated_circuit"
        | "ceiling_fan"
        | "security_camera"
        | "tv_outlet"
        | "remodel_wiring"
        | "new_construction"
        | "inspection_permit_support"
        | "contractor_support"
        | "other"
      payment_status:
        | "unpaid"
        | "partial"
        | "paid"
        | "deposit_paid"
        | "refunded"
      permit_status: "yes" | "no" | "not_sure"
      photo_type: "customer_upload" | "before" | "after" | "receipt" | "other"
      portfolio_category:
        | "new_construction"
        | "panel_upgrades"
        | "service_changes"
        | "lighting"
        | "outlets_gfci"
        | "troubleshooting"
        | "remodel_wiring"
        | "commercial"
        | "contractor_support"
        | "inspection_ready"
      review_platform: "google" | "nextdoor" | "facebook" | "other"
      urgency_level: "emergency" | "this_week" | "flexible" | "planning_ahead"
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
      app_role: ["admin", "staff"],
      calendar_event_type: [
        "estimate",
        "service_call",
        "rough_in",
        "trim_out",
        "panel_upgrade",
        "service_change",
        "inspection",
        "material_pickup",
        "follow_up",
        "final_walkthrough",
        "other",
      ],
      contact_method: ["call", "text", "email"],
      customer_type: [
        "homeowner",
        "landlord",
        "contractor",
        "investor",
        "business",
        "new_construction",
        "job_site",
      ],
      inspection_status: ["pending", "passed", "failed", "not_applicable"],
      inspection_type: ["rough", "service", "final", "other"],
      job_status: [
        "new_lead",
        "contacted",
        "estimate_scheduled",
        "estimate_sent",
        "approved",
        "down_payment_needed",
        "materials_needed",
        "scheduled",
        "in_progress",
        "waiting_on_permit",
        "waiting_on_inspection",
        "ready_for_inspection",
        "inspection_passed",
        "final_needed",
        "completed",
        "paid",
        "review_requested",
        "archived",
        "lost_lead",
        "cancelled",
      ],
      job_type: [
        "electrical_repair",
        "troubleshooting",
        "panel_upgrade",
        "service_change",
        "lighting_installation",
        "outlet_switch_gfci",
        "dedicated_circuit",
        "ceiling_fan",
        "security_camera",
        "tv_outlet",
        "remodel_wiring",
        "new_construction",
        "inspection_permit_support",
        "contractor_support",
        "other",
      ],
      payment_status: ["unpaid", "partial", "paid", "deposit_paid", "refunded"],
      permit_status: ["yes", "no", "not_sure"],
      photo_type: ["customer_upload", "before", "after", "receipt", "other"],
      portfolio_category: [
        "new_construction",
        "panel_upgrades",
        "service_changes",
        "lighting",
        "outlets_gfci",
        "troubleshooting",
        "remodel_wiring",
        "commercial",
        "contractor_support",
        "inspection_ready",
      ],
      review_platform: ["google", "nextdoor", "facebook", "other"],
      urgency_level: ["emergency", "this_week", "flexible", "planning_ahead"],
    },
  },
} as const
