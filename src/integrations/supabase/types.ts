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
          scope: string
          updated_at: string
        }
        Insert: {
          buckets?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          scope?: string
          updated_at?: string
        }
        Update: {
          buckets?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      allocations: {
        Row: {
          created_at: string
          direct_costs: number
          gross_amount: number
          id: string
          net_amount: number
          notes: string | null
          overhead_amount: number
          owner_pay_amount: number
          period_week: string
          reserve_amount: number
          source_id: string | null
          source_type: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          direct_costs?: number
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          overhead_amount?: number
          owner_pay_amount?: number
          period_week: string
          reserve_amount?: number
          source_id?: string | null
          source_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          direct_costs?: number
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          overhead_amount?: number
          owner_pay_amount?: number
          period_week?: string
          reserve_amount?: number
          source_id?: string | null
          source_type?: string
          status?: string
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
      bill_occurrences: {
        Row: {
          affects_live_cash: boolean
          amount: number
          bill_id: string
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          paid: boolean
          paid_amount: number
          paid_from: string | null
          paid_on: string | null
          payment_method: string | null
          period_month: string
          updated_at: string
        }
        Insert: {
          affects_live_cash?: boolean
          amount?: number
          bill_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid?: boolean
          paid_amount?: number
          paid_from?: string | null
          paid_on?: string | null
          payment_method?: string | null
          period_month: string
          updated_at?: string
        }
        Update: {
          affects_live_cash?: boolean
          amount?: number
          bill_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid?: boolean
          paid_amount?: number
          paid_from?: string | null
          paid_on?: string | null
          payment_method?: string | null
          period_month?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_occurrences_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          affects_live_cash: boolean
          amount: number
          bill_type: string
          category: string
          created_at: string
          due_date: string | null
          id: string
          name: string
          notes: string | null
          paid: boolean
          paid_from: string | null
          paid_on: string | null
          payment_method: string | null
          priority: string
          recurring: boolean
          recurring_frequency: string | null
          updated_at: string
        }
        Insert: {
          affects_live_cash?: boolean
          amount?: number
          bill_type?: string
          category?: string
          created_at?: string
          due_date?: string | null
          id?: string
          name: string
          notes?: string | null
          paid?: boolean
          paid_from?: string | null
          paid_on?: string | null
          payment_method?: string | null
          priority?: string
          recurring?: boolean
          recurring_frequency?: string | null
          updated_at?: string
        }
        Update: {
          affects_live_cash?: boolean
          amount?: number
          bill_type?: string
          category?: string
          created_at?: string
          due_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          paid?: boolean
          paid_from?: string | null
          paid_on?: string | null
          payment_method?: string | null
          priority?: string
          recurring?: boolean
          recurring_frequency?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      business_assignments: {
        Row: {
          amount: number
          assigned_on: string
          category: string | null
          created_at: string
          id: string
          notes: string | null
          source_id: string | null
          status: string
          target_id: string | null
          target_type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          assigned_on?: string
          category?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          source_id?: string | null
          status?: string
          target_id?: string | null
          target_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          assigned_on?: string
          category?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          source_id?: string | null
          status?: string
          target_id?: string | null
          target_type?: string
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
      cash_reconciliations: {
        Row: {
          account_name: string | null
          account_type: Database["public"]["Enums"]["cash_account_type"]
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          reconciled_balance: number
          reconciliation_date: string
        }
        Insert: {
          account_name?: string | null
          account_type: Database["public"]["Enums"]["cash_account_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          reconciled_balance?: number
          reconciliation_date?: string
        }
        Update: {
          account_name?: string | null
          account_type?: Database["public"]["Enums"]["cash_account_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          reconciled_balance?: number
          reconciliation_date?: string
        }
        Relationships: []
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
          affects_live_cash: boolean
          amount: number
          created_at: string
          debt_id: string
          id: string
          method: string
          notes: string | null
          paid_from: string | null
          paid_on: string
        }
        Insert: {
          affects_live_cash?: boolean
          amount?: number
          created_at?: string
          debt_id: string
          id?: string
          method?: string
          notes?: string | null
          paid_from?: string | null
          paid_on?: string
        }
        Update: {
          affects_live_cash?: boolean
          amount?: number
          created_at?: string
          debt_id?: string
          id?: string
          method?: string
          notes?: string | null
          paid_from?: string | null
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
          debt_scope: string
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
          debt_scope?: string
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
          debt_scope?: string
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
      estimate_templates: {
        Row: {
          active: boolean
          created_at: string
          deposit: number
          display_order: number
          id: string
          label: string
          materials: string
          scope: string
          slug: string | null
          total: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          deposit?: number
          display_order?: number
          id?: string
          label: string
          materials?: string
          scope?: string
          slug?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          deposit?: number
          display_order?: number
          id?: string
          label?: string
          materials?: string
          scope?: string
          slug?: string | null
          total?: number
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
          share_token: string | null
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
          share_token?: string | null
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
          share_token?: string | null
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
      historical_income: {
        Row: {
          already_spent: boolean
          amount: number
          count_in_cash: boolean
          count_in_ytd: boolean
          created_at: string
          customer_name: string | null
          description: string | null
          entry_date: string
          est_materials_amount: number | null
          est_materials_pct: number
          id: string
          notes: string | null
          scope: string
          source: string
          updated_at: string
        }
        Insert: {
          already_spent?: boolean
          amount?: number
          count_in_cash?: boolean
          count_in_ytd?: boolean
          created_at?: string
          customer_name?: string | null
          description?: string | null
          entry_date?: string
          est_materials_amount?: number | null
          est_materials_pct?: number
          id?: string
          notes?: string | null
          scope?: string
          source?: string
          updated_at?: string
        }
        Update: {
          already_spent?: boolean
          amount?: number
          count_in_cash?: boolean
          count_in_ytd?: boolean
          created_at?: string
          customer_name?: string | null
          description?: string | null
          entry_date?: string
          est_materials_amount?: number | null
          est_materials_pct?: number
          id?: string
          notes?: string | null
          scope?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          admin_notes: string | null
          availability: string | null
          city: string | null
          converted_worker_id: string | null
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
          converted_worker_id?: string | null
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
          converted_worker_id?: string | null
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
      job_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          display_order: number
          due_date: string | null
          id: string
          job_id: string
          notes: string | null
          status: string
          title: string
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          display_order?: number
          due_date?: string | null
          id?: string
          job_id: string
          notes?: string | null
          status?: string
          title: string
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          display_order?: number
          due_date?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          status?: string
          title?: string
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: []
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
          property_id: string | null
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
          property_id?: string | null
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
          property_id?: string | null
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
          {
            foreignKeyName: "jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_alert_log: {
        Row: {
          error: string | null
          id: string
          lead_type: string
          ok: boolean
          payload: Json | null
          sent_at: string
        }
        Insert: {
          error?: string | null
          id?: string
          lead_type: string
          ok?: boolean
          payload?: Json | null
          sent_at?: string
        }
        Update: {
          error?: string | null
          id?: string
          lead_type?: string
          ok?: boolean
          payload?: Json | null
          sent_at?: string
        }
        Relationships: []
      }
      lead_notification_settings: {
        Row: {
          alert_email: string | null
          alert_phone: string | null
          created_at: string
          from_number: string | null
          id: string
          notify_application: boolean
          notify_contact_form: boolean
          notify_estimate_request: boolean
          notify_service_request: boolean
          notify_voucher_request: boolean
          singleton: boolean
          sms_enabled: boolean
          updated_at: string
        }
        Insert: {
          alert_email?: string | null
          alert_phone?: string | null
          created_at?: string
          from_number?: string | null
          id?: string
          notify_application?: boolean
          notify_contact_form?: boolean
          notify_estimate_request?: boolean
          notify_service_request?: boolean
          notify_voucher_request?: boolean
          singleton?: boolean
          sms_enabled?: boolean
          updated_at?: string
        }
        Update: {
          alert_email?: string | null
          alert_phone?: string | null
          created_at?: string
          from_number?: string | null
          id?: string
          notify_application?: boolean
          notify_contact_form?: boolean
          notify_estimate_request?: boolean
          notify_service_request?: boolean
          notify_voucher_request?: boolean
          singleton?: boolean
          sms_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      owner_pay_transfers: {
        Row: {
          allocation_id: string | null
          amount: number
          created_at: string
          id: string
          notes: string | null
          status: string
          transferred_on: string
          updated_at: string
        }
        Insert: {
          allocation_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          transferred_on?: string
          updated_at?: string
        }
        Update: {
          allocation_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          transferred_on?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_pay_transfers_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_pay_transfers_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "v_allocation_available"
            referencedColumns: ["id"]
          },
        ]
      }
      paystubs: {
        Row: {
          created_at: string
          deductions_total: number
          employee_savings: number
          employer_total_cost: number
          fed_wh: number
          fica_ee: number
          fica_er: number
          gross: number
          hourly_rate: number
          hours: number
          id: string
          ins_amt: number
          local_wh: number
          net_pay: number
          notes: string | null
          pay_date: string
          pdf_url: string | null
          period_end: string
          period_start: string
          ppe_amt: number
          retirement: number
          state_wh: number
          status: string
          updated_at: string
          wc_amt: number
          worker_id: string
        }
        Insert: {
          created_at?: string
          deductions_total?: number
          employee_savings?: number
          employer_total_cost?: number
          fed_wh?: number
          fica_ee?: number
          fica_er?: number
          gross?: number
          hourly_rate?: number
          hours?: number
          id?: string
          ins_amt?: number
          local_wh?: number
          net_pay?: number
          notes?: string | null
          pay_date?: string
          pdf_url?: string | null
          period_end: string
          period_start: string
          ppe_amt?: number
          retirement?: number
          state_wh?: number
          status?: string
          updated_at?: string
          wc_amt?: number
          worker_id: string
        }
        Update: {
          created_at?: string
          deductions_total?: number
          employee_savings?: number
          employer_total_cost?: number
          fed_wh?: number
          fica_ee?: number
          fica_er?: number
          gross?: number
          hourly_rate?: number
          hours?: number
          id?: string
          ins_amt?: number
          local_wh?: number
          net_pay?: number
          notes?: string | null
          pay_date?: string
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          ppe_amt?: number
          retirement?: number
          state_wh?: number
          status?: string
          updated_at?: string
          wc_amt?: number
          worker_id?: string
        }
        Relationships: []
      }
      personal_assignments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          source_transfer_id: string | null
          status: string
          target_id: string | null
          target_type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          source_transfer_id?: string | null
          status?: string
          target_id?: string | null
          target_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          source_transfer_id?: string | null
          status?: string
          target_id?: string | null
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_assignments_source_transfer_id_fkey"
            columns: ["source_transfer_id"]
            isOneToOne: false
            referencedRelation: "owner_pay_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          expense_date: string
          id: string
          is_income: boolean
          method: string
          notes: string | null
          recurring: boolean
          related_bill_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          is_income?: boolean
          method?: string
          notes?: string | null
          recurring?: boolean
          related_bill_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          is_income?: boolean
          method?: string
          notes?: string | null
          recurring?: boolean
          related_bill_id?: string | null
          updated_at?: string
        }
        Relationships: []
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
      properties: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          customer_id: string
          id: string
          is_primary: boolean
          nickname: string | null
          notes: string | null
          owner_name: string | null
          owner_phone: string | null
          property_type: string
          state: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_primary?: boolean
          nickname?: string | null
          notes?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          property_type?: string
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_primary?: boolean
          nickname?: string | null
          notes?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          property_type?: string
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
      service_vouchers: {
        Row: {
          amount_paid: number
          code: string
          created_at: string
          credit_used: number
          credit_value: number
          customer_email: string | null
          customer_id: string | null
          customer_name_snapshot: string | null
          customer_phone: string | null
          expires_on: string | null
          id: string
          labor_only: boolean
          materials_included: boolean
          notes: string | null
          offer_id: string | null
          payment_method: string | null
          purchase_date: string
          status: string
          terms: string | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          code: string
          created_at?: string
          credit_used?: number
          credit_value?: number
          customer_email?: string | null
          customer_id?: string | null
          customer_name_snapshot?: string | null
          customer_phone?: string | null
          expires_on?: string | null
          id?: string
          labor_only?: boolean
          materials_included?: boolean
          notes?: string | null
          offer_id?: string | null
          payment_method?: string | null
          purchase_date?: string
          status?: string
          terms?: string | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          code?: string
          created_at?: string
          credit_used?: number
          credit_value?: number
          customer_email?: string | null
          customer_id?: string | null
          customer_name_snapshot?: string | null
          customer_phone?: string | null
          expires_on?: string | null
          id?: string
          labor_only?: boolean
          materials_included?: boolean
          notes?: string | null
          offer_id?: string | null
          payment_method?: string | null
          purchase_date?: string
          status?: string
          terms?: string | null
          updated_at?: string
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
      voucher_offers: {
        Row: {
          active: boolean
          amount_paid: number
          bonus: number
          created_at: string
          credit_value: number
          display_order: number
          id: string
          labor_only: boolean
          materials_included: boolean
          max_per_job: number | null
          min_job_size: number | null
          name: string
          terms: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount_paid?: number
          bonus?: number
          created_at?: string
          credit_value?: number
          display_order?: number
          id?: string
          labor_only?: boolean
          materials_included?: boolean
          max_per_job?: number | null
          min_job_size?: number | null
          name: string
          terms?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount_paid?: number
          bonus?: number
          created_at?: string
          credit_value?: number
          display_order?: number
          id?: string
          labor_only?: boolean
          materials_included?: boolean
          max_per_job?: number | null
          min_job_size?: number | null
          name?: string
          terms?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      voucher_redemptions: {
        Row: {
          amount_applied: number
          applied_on: string
          created_at: string
          id: string
          job_id: string | null
          notes: string | null
          voucher_id: string
        }
        Insert: {
          amount_applied?: number
          applied_on?: string
          created_at?: string
          id?: string
          job_id?: string | null
          notes?: string | null
          voucher_id: string
        }
        Update: {
          amount_applied?: number
          applied_on?: string
          created_at?: string
          id?: string
          job_id?: string | null
          notes?: string | null
          voucher_id?: string
        }
        Relationships: []
      }
      voucher_requests: {
        Row: {
          created_at: string
          customer_name: string
          email: string | null
          id: string
          notes: string | null
          offer_id: string | null
          phone: string | null
          status: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          email?: string | null
          id?: string
          notes?: string | null
          offer_id?: string | null
          phone?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          email?: string | null
          id?: string
          notes?: string | null
          offer_id?: string | null
          phone?: string | null
          status?: string
        }
        Relationships: []
      }
      worker_documents: {
        Row: {
          created_at: string
          doc_key: string
          id: string
          notes: string | null
          received: boolean
          received_on: string | null
          updated_at: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          doc_key: string
          id?: string
          notes?: string | null
          received?: boolean
          received_on?: string | null
          updated_at?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          doc_key?: string
          id?: string
          notes?: string | null
          received?: boolean
          received_on?: string | null
          updated_at?: string
          worker_id?: string
        }
        Relationships: []
      }
      worker_invite_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          error: string | null
          id: string
          success: boolean
          worker_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          success?: boolean
          worker_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          success?: boolean
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_invite_log_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          notes: string | null
          paid_on: string
          worker_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          paid_on?: string
          worker_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          paid_on?: string
          worker_id?: string
        }
        Relationships: []
      }
      worker_savings_ledger: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          entry_date: string
          id: string
          method: string | null
          notes: string | null
          paystub_id: string | null
          txn_type: string
          worker_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          method?: string | null
          notes?: string | null
          paystub_id?: string | null
          txn_type?: string
          worker_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          method?: string | null
          notes?: string | null
          paystub_id?: string | null
          txn_type?: string
          worker_id?: string
        }
        Relationships: []
      }
      worker_time_entries: {
        Row: {
          amount: number
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          created_at: string
          end_time: string | null
          hourly_rate: number
          hours: number
          id: string
          job_id: string | null
          notes: string | null
          paid: boolean
          paid_at: string | null
          paystub_id: string | null
          rejected_reason: string | null
          start_time: string | null
          status: string
          work_date: string
          worker_id: string
        }
        Insert: {
          amount?: number
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_time?: string | null
          hourly_rate?: number
          hours?: number
          id?: string
          job_id?: string | null
          notes?: string | null
          paid?: boolean
          paid_at?: string | null
          paystub_id?: string | null
          rejected_reason?: string | null
          start_time?: string | null
          status?: string
          work_date?: string
          worker_id: string
        }
        Update: {
          amount?: number
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_time?: string | null
          hourly_rate?: number
          hours?: number
          id?: string
          job_id?: string | null
          notes?: string | null
          paid?: boolean
          paid_at?: string | null
          paystub_id?: string | null
          rejected_reason?: string | null
          start_time?: string | null
          status?: string
          work_date?: string
          worker_id?: string
        }
        Relationships: []
      }
      workers: {
        Row: {
          active: boolean
          auth_user_id: string | null
          created_at: string
          email: string | null
          full_name: string
          hourly_rate: number
          id: string
          insurance_pct: number
          invite_status: string
          is_owner: boolean
          login_identifier: string | null
          login_last_at: string | null
          login_pin_hash: string | null
          login_pin_set_at: string | null
          notes: string | null
          onboarding: Json
          pay_day: string
          pay_mode: string
          pay_schedule: string
          pay_type: string
          phone: string | null
          ppe_monthly: number
          role: string
          savings_auth_date: string | null
          savings_auth_received: boolean
          savings_destination: string | null
          savings_enabled: boolean
          savings_fixed: number
          savings_notes: string | null
          savings_pct: number
          savings_type: string
          tax_pct: number
          updated_at: string
          weekly_salary: number
          worker_type: string
          workers_comp_pct: number
        }
        Insert: {
          active?: boolean
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          hourly_rate?: number
          id?: string
          insurance_pct?: number
          invite_status?: string
          is_owner?: boolean
          login_identifier?: string | null
          login_last_at?: string | null
          login_pin_hash?: string | null
          login_pin_set_at?: string | null
          notes?: string | null
          onboarding?: Json
          pay_day?: string
          pay_mode?: string
          pay_schedule?: string
          pay_type?: string
          phone?: string | null
          ppe_monthly?: number
          role?: string
          savings_auth_date?: string | null
          savings_auth_received?: boolean
          savings_destination?: string | null
          savings_enabled?: boolean
          savings_fixed?: number
          savings_notes?: string | null
          savings_pct?: number
          savings_type?: string
          tax_pct?: number
          updated_at?: string
          weekly_salary?: number
          worker_type?: string
          workers_comp_pct?: number
        }
        Update: {
          active?: boolean
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          hourly_rate?: number
          id?: string
          insurance_pct?: number
          invite_status?: string
          is_owner?: boolean
          login_identifier?: string | null
          login_last_at?: string | null
          login_pin_hash?: string | null
          login_pin_set_at?: string | null
          notes?: string | null
          onboarding?: Json
          pay_day?: string
          pay_mode?: string
          pay_schedule?: string
          pay_type?: string
          phone?: string | null
          ppe_monthly?: number
          role?: string
          savings_auth_date?: string | null
          savings_auth_received?: boolean
          savings_destination?: string | null
          savings_enabled?: boolean
          savings_fixed?: number
          savings_notes?: string | null
          savings_pct?: number
          savings_type?: string
          tax_pct?: number
          updated_at?: string
          weekly_salary?: number
          worker_type?: string
          workers_comp_pct?: number
        }
        Relationships: []
      }
    }
    Views: {
      v_allocation_available: {
        Row: {
          created_at: string | null
          direct_costs: number | null
          gross_amount: number | null
          id: string | null
          net_amount: number | null
          notes: string | null
          overhead_amount: number | null
          owner_pay_amount: number | null
          period_week: string | null
          reserve_amount: number | null
          source_id: string | null
          source_type: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          direct_costs?: number | null
          gross_amount?: number | null
          id?: string | null
          net_amount?: number | null
          notes?: string | null
          overhead_amount?: number | null
          owner_pay_amount?: number | null
          period_week?: string | null
          reserve_amount?: number | null
          source_id?: string | null
          source_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          direct_costs?: number | null
          gross_amount?: number | null
          id?: string | null
          net_amount?: number | null
          notes?: string | null
          overhead_amount?: number | null
          owner_pay_amount?: number | null
          period_week?: string | null
          reserve_amount?: number | null
          source_id?: string | null
          source_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_bill_month_totals: {
        Row: {
          business_bills_remaining: number | null
          paid_this_month: number | null
          past_due_unpaid: number | null
          personal_bills_remaining: number | null
          remaining_this_month: number | null
          total_monthly_bills: number | null
        }
        Relationships: []
      }
      v_business_assigned: {
        Row: {
          assigned_total: number | null
        }
        Relationships: []
      }
      v_business_live_cash: {
        Row: {
          bills_out: number | null
          debt_out: number | null
          historical_in: number | null
          is_reconciled: boolean | null
          live_cash: number | null
          materials_out: number | null
          payments_in: number | null
          reconciled_balance: number | null
          reconciliation_date: string | null
          transfers_out: number | null
          voucher_cash_in: number | null
          worker_pay_out: number | null
        }
        Relationships: []
      }
      v_open_job_balances: {
        Row: {
          open_balance: number | null
        }
        Relationships: []
      }
      v_personal_assigned: {
        Row: {
          assigned_total: number | null
        }
        Relationships: []
      }
      v_personal_live_cash: {
        Row: {
          bills_out: number | null
          debt_out: number | null
          is_reconciled: boolean | null
          live_cash: number | null
          owner_worker_pay_in: number | null
          personal_exp_out: number | null
          personal_income_in: number | null
          reconciled_balance: number | null
          reconciliation_date: string | null
          transfers_in: number | null
        }
        Relationships: []
      }
      v_voucher_liability: {
        Row: {
          outstanding: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_first_admin: { Args: never; Returns: boolean }
      fix_bill_occurrences: { Args: { _today?: string }; Returns: Json }
      get_estimate_by_token: { Args: { _token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_worker_for_job: {
        Args: { _job_id: string; _uid: string }
        Returns: boolean
      }
      my_worker_id: { Args: never; Returns: string }
      recompute_all_debt_balances: { Args: never; Returns: number }
      recompute_all_job_balances: { Args: never; Returns: number }
      recompute_debt_balance: { Args: { _debt_id: string }; Returns: undefined }
      recompute_job_totals: { Args: { _job_id: string }; Returns: undefined }
      recompute_job_worker_labor: {
        Args: { _job_id: string }
        Returns: undefined
      }
      reverse_allocation_batch: {
        Args: { _allocation_id: string; _note?: string }
        Returns: boolean
      }
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
      cash_account_type: "business" | "personal"
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
        | "auction_job"
        | "ev_charger"
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
      cash_account_type: ["business", "personal"],
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
        "auction_job",
        "ev_charger",
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
