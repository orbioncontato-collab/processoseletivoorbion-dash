export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_type: Database["public"]["Enums"]["actor_type"];
          changes: Json | null;
          company_id: string | null;
          entity_id: string | null;
          entity_type: string;
          id: number;
          metadata: NonNullable<Json>;
          occurred_at: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_type: Database["public"]["Enums"]["actor_type"];
          changes?: Json | null;
          company_id?: string | null;
          entity_id?: string | null;
          entity_type: string;
          id?: never;
          metadata?: NonNullable<Json>;
          occurred_at?: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_type?: Database["public"]["Enums"]["actor_type"];
          changes?: Json | null;
          company_id?: string | null;
          entity_id?: string | null;
          entity_type?: string;
          id?: never;
          metadata?: NonNullable<Json>;
          occurred_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      alerts: {
        Row: {
          company_id: string;
          dedupe_key: string;
          detail: NonNullable<Json>;
          dismissed_at: string | null;
          dismissed_by: string | null;
          entity_id: string | null;
          entity_type: string | null;
          first_seen_at: string;
          id: string;
          last_seen_at: string;
          reference_date: string | null;
          resolved_at: string | null;
          severity: string;
          status: string;
          title: string;
          type: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          dedupe_key: string;
          detail?: NonNullable<Json>;
          dismissed_at?: string | null;
          dismissed_by?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          first_seen_at?: string;
          id?: string;
          last_seen_at?: string;
          reference_date?: string | null;
          resolved_at?: string | null;
          severity: string;
          status?: string;
          title: string;
          type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          company_id?: string;
          dedupe_key?: string;
          detail?: NonNullable<Json>;
          dismissed_at?: string | null;
          dismissed_by?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          first_seen_at?: string;
          id?: string;
          last_seen_at?: string;
          reference_date?: string | null;
          resolved_at?: string | null;
          severity?: string;
          status?: string;
          title?: string;
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          created_at: string;
          id: string;
          max_users: number;
          name: string;
          slug: string;
          status: string;
          timezone: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          max_users?: number;
          name: string;
          slug: string;
          status?: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          max_users?: number;
          name?: string;
          slug?: string;
          status?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      company_settings: {
        Row: {
          alerts_refreshed_at: string | null;
          awaiting_reply_hours: number;
          company_id: string;
          daily_target_conversations: number | null;
          daily_target_messages: number | null;
          report_grace_hours: number;
          stale_days: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          alerts_refreshed_at?: string | null;
          awaiting_reply_hours?: number;
          company_id: string;
          daily_target_conversations?: number | null;
          daily_target_messages?: number | null;
          report_grace_hours?: number;
          stale_days?: number;
          updated_at?: string;
        };
        Update: {
          alerts_refreshed_at?: string | null;
          awaiting_reply_hours?: number;
          company_id?: string;
          daily_target_conversations?: number | null;
          daily_target_messages?: number | null;
          report_grace_hours?: number;
          stale_days?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: true;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      contacts: {
        Row: {
          archived_at: string | null;
          company_id: string;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          organization: string | null;
          owner_id: string;
          phone_e164: string | null;
          source: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          company_id: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          organization?: string | null;
          owner_id: string;
          phone_e164?: string | null;
          source?: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          company_id?: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          organization?: string | null;
          owner_id?: string;
          phone_e164?: string | null;
          source?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          awaiting_reply: boolean;
          channel: string;
          company_id: string;
          contact_id: string;
          created_at: string;
          external_id: string;
          id: string;
          inbound_count: number;
          last_inbound_at: string | null;
          last_message_at: string;
          last_outbound_at: string | null;
          opportunity_id: string | null;
          outbound_count: number;
          owner_id: string;
          source_id: string;
          started_at: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          awaiting_reply?: boolean;
          channel?: string;
          company_id: string;
          contact_id: string;
          created_at?: string;
          external_id: string;
          id?: string;
          inbound_count?: number;
          last_inbound_at?: string | null;
          last_message_at: string;
          last_outbound_at?: string | null;
          opportunity_id?: string | null;
          outbound_count?: number;
          owner_id: string;
          source_id: string;
          started_at: string;
          updated_at?: string;
        };
        Update: {
          awaiting_reply?: boolean;
          channel?: string;
          company_id?: string;
          contact_id?: string;
          created_at?: string;
          external_id?: string;
          id?: string;
          inbound_count?: number;
          last_inbound_at?: string | null;
          last_message_at?: string;
          last_outbound_at?: string | null;
          opportunity_id?: string | null;
          outbound_count?: number;
          owner_id?: string;
          source_id?: string;
          started_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_company_id_contact_id_fkey";
            columns: ["company_id", "contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["company_id", "id"];
          },
          {
            foreignKeyName: "conversations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_company_id_source_id_fkey";
            columns: ["company_id", "source_id"];
            isOneToOne: false;
            referencedRelation: "integration_sources";
            referencedColumns: ["company_id", "id"];
          },
          {
            foreignKeyName: "conversations_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["id"];
          },
        ];
      };
      divergences: {
        Row: {
          captured: number;
          company_id: string;
          created_at: string;
          declared: number;
          id: string;
          justification: string | null;
          justified_at: string | null;
          metric_key: string;
          question_id: string;
          reference_date: string;
          status: string;
          updated_at: string;
          user_id: string;
          verified_at: string | null;
          verified_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          captured: number;
          company_id: string;
          created_at?: string;
          declared: number;
          id?: string;
          justification?: string | null;
          justified_at?: string | null;
          metric_key: string;
          question_id: string;
          reference_date: string;
          status?: string;
          updated_at?: string;
          user_id: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          captured?: number;
          company_id?: string;
          created_at?: string;
          declared?: number;
          id?: string;
          justification?: string | null;
          justified_at?: string | null;
          metric_key?: string;
          question_id?: string;
          reference_date?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "divergences_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "divergences_company_id_question_id_fkey";
            columns: ["company_id", "question_id"];
            isOneToOne: false;
            referencedRelation: "report_questions";
            referencedColumns: ["company_id", "id"];
          },
        ];
      };
      external_refs: {
        Row: {
          company_id: string;
          created_at: string;
          entity_id: string;
          entity_type: string;
          external_id: string;
          id: string;
          source_id: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          external_id: string;
          id?: string;
          source_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          external_id?: string;
          id?: string;
          source_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "external_refs_company_id_source_id_fkey";
            columns: ["company_id", "source_id"];
            isOneToOne: false;
            referencedRelation: "integration_sources";
            referencedColumns: ["company_id", "id"];
          },
        ];
      };
      integration_sources: {
        Row: {
          archived_at: string | null;
          company_id: string;
          config: NonNullable<Json>;
          created_at: string;
          created_by: string | null;
          id: string;
          kind: Database["public"]["Enums"]["source_kind"];
          last_error: string | null;
          last_event_at: string | null;
          name: string;
          owner_user_id: string | null;
          provider: string;
          secret_hash: string | null;
          secret_hint: string | null;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          company_id: string;
          config?: NonNullable<Json>;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["source_kind"];
          last_error?: string | null;
          last_event_at?: string | null;
          name: string;
          owner_user_id?: string | null;
          provider?: string;
          secret_hash?: string | null;
          secret_hint?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          company_id?: string;
          config?: NonNullable<Json>;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["source_kind"];
          last_error?: string | null;
          last_event_at?: string | null;
          name?: string;
          owner_user_id?: string | null;
          provider?: string;
          secret_hash?: string | null;
          secret_hint?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integration_sources_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          company_id: string;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          invited_by: string | null;
          role: Database["public"]["Enums"]["member_role"];
          status: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          company_id: string;
          created_at?: string;
          email: string;
          full_name?: string;
          id?: string;
          invited_by?: string | null;
          role: Database["public"]["Enums"]["member_role"];
          status?: string;
          user_id?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          company_id?: string;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          invited_by?: string | null;
          role?: Database["public"]["Enums"]["member_role"];
          status?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      memberships: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["member_role"];
          status: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["member_role"];
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["member_role"];
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string | null;
          company_id: string;
          conversation_id: string;
          created_at: string;
          direction: string;
          external_id: string;
          id: string;
          message_type: string;
          sent_at: string;
          source_id: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string | null;
          company_id: string;
          conversation_id: string;
          created_at?: string;
          direction: string;
          external_id: string;
          id?: string;
          message_type?: string;
          sent_at: string;
          source_id: string;
        };
        Update: {
          body?: string | null;
          company_id?: string;
          conversation_id?: string;
          created_at?: string;
          direction?: string;
          external_id?: string;
          id?: string;
          message_type?: string;
          sent_at?: string;
          source_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_company_id_conversation_id_fkey";
            columns: ["company_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["company_id", "id"];
          },
        ];
      };
      opportunities: {
        Row: {
          closed_at: string | null;
          company_id: string;
          contact_id: string;
          created_at: string;
          expected_close_date: string | null;
          id: string;
          last_activity_at: string;
          lost_reason: string | null;
          lost_reason_detail: string | null;
          next_step: string | null;
          next_step_at: string | null;
          owner_id: string;
          pipeline_id: string;
          product: string | null;
          source: string;
          stage_id: string;
          status: Database["public"]["Enums"]["opportunity_status"];
          title: string;
          updated_at: string;
          value_cents: number;
        };
        ComputedFields: never;
        Insert: {
          closed_at?: string | null;
          company_id: string;
          contact_id: string;
          created_at?: string;
          expected_close_date?: string | null;
          id?: string;
          last_activity_at?: string;
          lost_reason?: string | null;
          lost_reason_detail?: string | null;
          next_step?: string | null;
          next_step_at?: string | null;
          owner_id: string;
          pipeline_id: string;
          product?: string | null;
          source?: string;
          stage_id: string;
          status?: Database["public"]["Enums"]["opportunity_status"];
          title: string;
          updated_at?: string;
          value_cents?: number;
        };
        Update: {
          closed_at?: string | null;
          company_id?: string;
          contact_id?: string;
          created_at?: string;
          expected_close_date?: string | null;
          id?: string;
          last_activity_at?: string;
          lost_reason?: string | null;
          lost_reason_detail?: string | null;
          next_step?: string | null;
          next_step_at?: string | null;
          owner_id?: string;
          pipeline_id?: string;
          product?: string | null;
          source?: string;
          stage_id?: string;
          status?: Database["public"]["Enums"]["opportunity_status"];
          title?: string;
          updated_at?: string;
          value_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_contact_id_fkey";
            columns: ["company_id", "contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["company_id", "id"];
          },
          {
            foreignKeyName: "opportunities_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "opportunities_company_id_pipeline_id_fkey";
            columns: ["company_id", "pipeline_id"];
            isOneToOne: false;
            referencedRelation: "pipelines";
            referencedColumns: ["company_id", "id"];
          },
          {
            foreignKeyName: "opportunities_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_stages";
            referencedColumns: ["id"];
          },
        ];
      };
      opportunity_objections: {
        Row: {
          category: string;
          company_id: string;
          created_at: string;
          created_by: string | null;
          description: string;
          id: string;
          opportunity_id: string;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          category?: string;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          description: string;
          id?: string;
          opportunity_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          id?: string;
          opportunity_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "opportunity_objections_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "opportunity_objections_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["id"];
          },
        ];
      };
      pipeline_stages: {
        Row: {
          archived_at: string | null;
          company_id: string;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["stage_kind"];
          name: string;
          pipeline_id: string;
          position: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          company_id: string;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["stage_kind"];
          name: string;
          pipeline_id: string;
          position: number;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          company_id?: string;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["stage_kind"];
          name?: string;
          pipeline_id?: string;
          position?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pipeline_stages_company_id_pipeline_id_fkey";
            columns: ["company_id", "pipeline_id"];
            isOneToOne: false;
            referencedRelation: "pipelines";
            referencedColumns: ["company_id", "id"];
          },
        ];
      };
      pipelines: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          is_default: boolean;
          name: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pipelines_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_admins: {
        Row: {
          created_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email: string;
          full_name?: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      raw_events: {
        Row: {
          attempts: number;
          company_id: string;
          error: string | null;
          event_type: string;
          id: number;
          idempotency_key: string | null;
          payload: NonNullable<Json>;
          processed_at: string | null;
          received_at: string;
          result: Json | null;
          source_id: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          attempts?: number;
          company_id: string;
          error?: string | null;
          event_type: string;
          id?: never;
          idempotency_key?: string | null;
          payload: NonNullable<Json>;
          processed_at?: string | null;
          received_at?: string;
          result?: Json | null;
          source_id: string;
          status?: string;
        };
        Update: {
          attempts?: number;
          company_id?: string;
          error?: string | null;
          event_type?: string;
          id?: never;
          idempotency_key?: string | null;
          payload?: NonNullable<Json>;
          processed_at?: string | null;
          received_at?: string;
          result?: Json | null;
          source_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "raw_events_company_id_source_id_fkey";
            columns: ["company_id", "source_id"];
            isOneToOne: false;
            referencedRelation: "integration_sources";
            referencedColumns: ["company_id", "id"];
          },
        ];
      };
      report_answers: {
        Row: {
          company_id: string;
          id: string;
          question_id: string;
          submission_id: string;
          value_number: number | null;
          value_options: string[] | null;
          value_text: string | null;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          id?: string;
          question_id: string;
          submission_id: string;
          value_number?: number | null;
          value_options?: string[] | null;
          value_text?: string | null;
        };
        Update: {
          company_id?: string;
          id?: string;
          question_id?: string;
          submission_id?: string;
          value_number?: number | null;
          value_options?: string[] | null;
          value_text?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "report_answers_company_id_question_id_fkey";
            columns: ["company_id", "question_id"];
            isOneToOne: false;
            referencedRelation: "report_questions";
            referencedColumns: ["company_id", "id"];
          },
          {
            foreignKeyName: "report_answers_company_id_submission_id_fkey";
            columns: ["company_id", "submission_id"];
            isOneToOne: false;
            referencedRelation: "report_submissions";
            referencedColumns: ["company_id", "id"];
          },
        ];
      };
      report_questions: {
        Row: {
          archived_at: string | null;
          company_id: string;
          created_at: string;
          help: string | null;
          id: string;
          kind: string;
          label: string;
          metric_key: string | null;
          metric_stage_id: string | null;
          options: string[];
          position: number;
          required: boolean;
          template_id: string;
          tolerance_abs: number;
          tolerance_pct: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          company_id: string;
          created_at?: string;
          help?: string | null;
          id?: string;
          kind: string;
          label: string;
          metric_key?: string | null;
          metric_stage_id?: string | null;
          options?: string[];
          position?: number;
          required?: boolean;
          template_id: string;
          tolerance_abs?: number;
          tolerance_pct?: number;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          company_id?: string;
          created_at?: string;
          help?: string | null;
          id?: string;
          kind?: string;
          label?: string;
          metric_key?: string | null;
          metric_stage_id?: string | null;
          options?: string[];
          position?: number;
          required?: boolean;
          template_id?: string;
          tolerance_abs?: number;
          tolerance_pct?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_questions_company_id_template_id_fkey";
            columns: ["company_id", "template_id"];
            isOneToOne: false;
            referencedRelation: "report_templates";
            referencedColumns: ["company_id", "id"];
          },
          {
            foreignKeyName: "report_questions_metric_stage_id_fkey";
            columns: ["metric_stage_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_stages";
            referencedColumns: ["id"];
          },
        ];
      };
      report_submissions: {
        Row: {
          company_id: string;
          id: string;
          reference_date: string;
          submitted_at: string;
          template_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          company_id: string;
          id?: string;
          reference_date: string;
          submitted_at?: string;
          template_id: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          company_id?: string;
          id?: string;
          reference_date?: string;
          submitted_at?: string;
          template_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_submissions_company_id_template_id_fkey";
            columns: ["company_id", "template_id"];
            isOneToOne: false;
            referencedRelation: "report_templates";
            referencedColumns: ["company_id", "id"];
          },
        ];
      };
      report_templates: {
        Row: {
          active: boolean;
          company_id: string;
          created_at: string;
          id: string;
          name: string;
          reference: string;
          schedule_time: string;
          updated_at: string;
          weekdays: number[];
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          company_id: string;
          created_at?: string;
          id?: string;
          name?: string;
          reference?: string;
          schedule_time?: string;
          updated_at?: string;
          weekdays?: number[];
        };
        Update: {
          active?: boolean;
          company_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          reference?: string;
          schedule_time?: string;
          updated_at?: string;
          weekdays?: number[];
        };
        Relationships: [
          {
            foreignKeyName: "report_templates_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      captured_metrics: {
        Args: {
          period_end: string;
          period_start: string;
          target_company: string;
          target_user: string;
        };
        Returns: {
          metric_key: string;
          stage_id: string;
          value: number;
        }[];
      };
      refresh_alerts: { Args: { now_ts?: string; target_company: string }; Returns: number };
      seller_daily_metrics: {
        Args: { period_end: string; period_start: string; target_company: string };
        Returns: {
          avg_first_response_seconds: number;
          awaiting_reply: number;
          conversations_active: number;
          conversations_started: number;
          messages_inbound: number;
          messages_outbound: number;
          owner_id: string;
        }[];
      };
    };
    Enums: {
      actor_type: "user" | "integration" | "automation" | "agent" | "system";
      member_role: "leader" | "seller";
      opportunity_status: "open" | "won" | "lost";
      source_kind: "webhook" | "crm" | "import" | "whatsapp_device" | "whatsapp_cloud";
      stage_kind: "open" | "won" | "lost";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      actor_type: ["user", "integration", "automation", "agent", "system"],
      member_role: ["leader", "seller"],
      opportunity_status: ["open", "won", "lost"],
      source_kind: ["webhook", "crm", "import", "whatsapp_device", "whatsapp_cloud"],
      stage_kind: ["open", "won", "lost"],
    },
  },
} as const;
