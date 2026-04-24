CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"full_name" text NOT NULL,
	"dni" varchar(8),
	"grade" text DEFAULT 'aspirante' NOT NULL,
	"status" text DEFAULT 'activo' NOT NULL,
	"gender" text,
	"phone" varchar(20),
	"email" text,
	"blood_type" varchar(5),
	"birth_date" date,
	"join_date" date,
	"avatar_url" text,
	"specialties" text[] DEFAULT '{}',
	"esbas_promotion" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "profiles_dni_unique" UNIQUE("dni")
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"normative_ref" text,
	"icon" text,
	"display_order" integer DEFAULT 0,
	CONSTRAINT "sections_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "section_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"role" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now(),
	"assigned_by" uuid,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "section_roles_profile_id_section_id_is_active_unique" UNIQUE("profile_id","section_id","is_active")
);
--> statement-breakpoint
CREATE TABLE "guard_beds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer NOT NULL,
	"sector" text,
	"status" text DEFAULT 'disponible',
	"notes" text,
	CONSTRAINT "guard_beds_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "guard_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"bed_id" uuid NOT NULL,
	"date" date NOT NULL,
	"check_in" timestamp with time zone,
	"check_out" timestamp with time zone,
	"status" text DEFAULT 'reservada',
	"approved_by" uuid,
	"hours_credited" numeric(4, 2),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "guard_shifts_bed_id_date_unique" UNIQUE("bed_id","date")
);
--> statement-breakpoint
CREATE TABLE "service_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"date" date NOT NULL,
	"hours" numeric(4, 2) NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"auto_registered" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"priority" text DEFAULT 'media' NOT NULL,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"category" text,
	"section_id" uuid,
	"reported_by" uuid NOT NULL,
	"assigned_to" uuid,
	"resolved_at" timestamp with time zone,
	"resolution_notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "incidents_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"section_id" uuid,
	"serial_number" text,
	"quantity" integer DEFAULT 1,
	"condition" text DEFAULT 'operativo',
	"location" text,
	"last_maintenance" date,
	"next_maintenance" date,
	"assigned_to" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "esbas_lessons" (
	"id" serial PRIMARY KEY NOT NULL,
	"module" text NOT NULL,
	"lesson_number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"duration_minutes" integer DEFAULT 180,
	"difficulty" text DEFAULT 'basico',
	"has_field_practice" boolean DEFAULT false,
	"specialty_unlocked" text,
	"required_lesson_id" integer,
	"content_theory" text[],
	"content_practice" text[],
	"content_evaluation" text[],
	"display_order" integer
);
--> statement-breakpoint
CREATE TABLE "esbas_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"lesson_id" integer NOT NULL,
	"status" text DEFAULT 'pendiente',
	"theory_completed" boolean DEFAULT false,
	"practice_completed" boolean DEFAULT false,
	"evaluation_score" numeric(4, 2),
	"completed_at" timestamp with time zone,
	"instructor_id" uuid,
	"notes" text,
	CONSTRAINT "esbas_progress_profile_id_lesson_id_unique" UNIQUE("profile_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "content_calendar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"date" date NOT NULL,
	"type" text,
	"platform" text[],
	"category" text,
	"status" text DEFAULT 'planificado',
	"assigned_to" uuid,
	"template_url" text,
	"media_urls" text[],
	"caption" text,
	"notes" text,
	"is_recurring" boolean DEFAULT false,
	"recurrence_rule" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"priority" text DEFAULT 'normal',
	"author_id" uuid NOT NULL,
	"target_sections" uuid[],
	"target_grades" text[],
	"published_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"is_pinned" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "section_roles" ADD CONSTRAINT "section_roles_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_roles" ADD CONSTRAINT "section_roles_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_roles" ADD CONSTRAINT "section_roles_assigned_by_profiles_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_shifts" ADD CONSTRAINT "guard_shifts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_shifts" ADD CONSTRAINT "guard_shifts_bed_id_guard_beds_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."guard_beds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_shifts" ADD CONSTRAINT "guard_shifts_approved_by_profiles_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_hours" ADD CONSTRAINT "service_hours_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_hours" ADD CONSTRAINT "service_hours_verified_by_profiles_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reported_by_profiles_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_assigned_to_profiles_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_assigned_to_profiles_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esbas_lessons" ADD CONSTRAINT "esbas_lessons_required_lesson_id_esbas_lessons_id_fk" FOREIGN KEY ("required_lesson_id") REFERENCES "public"."esbas_lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esbas_progress" ADD CONSTRAINT "esbas_progress_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esbas_progress" ADD CONSTRAINT "esbas_progress_lesson_id_esbas_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."esbas_lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esbas_progress" ADD CONSTRAINT "esbas_progress_instructor_id_profiles_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_calendar" ADD CONSTRAINT "content_calendar_assigned_to_profiles_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;