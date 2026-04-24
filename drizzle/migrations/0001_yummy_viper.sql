CREATE TABLE "emergencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"numero_parte" text NOT NULL,
	"tipo" text,
	"estado" text,
	"fecha_despacho" timestamp with time zone,
	"fecha_retorno" timestamp with time zone,
	"tipo_emergencia_id" integer,
	"direccion" text,
	"distrito" text,
	"al_mando_id" uuid,
	"al_mando_texto" text,
	"observaciones" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "emergencies_numero_parte_unique" UNIQUE("numero_parte")
);
--> statement-breakpoint
CREATE TABLE "emergency_crew_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"emergency_id" integer NOT NULL,
	"profile_id" uuid,
	"vehicle_id" integer,
	"rol" text,
	"nombre_texto" text,
	CONSTRAINT "emergency_crew_members_emergency_id_profile_id_unique" UNIQUE("emergency_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "emergency_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"descripcion" text NOT NULL,
	CONSTRAINT "emergency_types_descripcion_unique" UNIQUE("descripcion")
);
--> statement-breakpoint
CREATE TABLE "emergency_vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"emergency_id" integer NOT NULL,
	"codigo_vehiculo" text NOT NULL,
	"nombre_vehiculo" text,
	"hora_salida" timestamp with time zone,
	"hora_retorno" timestamp with time zone,
	"km_salida" integer,
	"km_retorno" integer,
	CONSTRAINT "emergency_vehicles_emergency_id_codigo_vehiculo_unique" UNIQUE("emergency_id","codigo_vehiculo")
);
--> statement-breakpoint
CREATE TABLE "hired_drivers" (
	"id" serial PRIMARY KEY NOT NULL,
	"apellidos" text NOT NULL,
	"nombres" text NOT NULL,
	"dni" text,
	"telefono" text,
	"activo" text DEFAULT 'si'
);
--> statement-breakpoint
CREATE TABLE "cgbvp_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"mes" integer NOT NULL,
	"anio" integer NOT NULL,
	"dias_asistidos" integer DEFAULT 0,
	"dias_guardia" integer DEFAULT 0,
	"horas_acumuladas" integer DEFAULT 0,
	"num_emergencias" integer DEFAULT 0,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "cgbvp_attendance_profile_id_mes_anio_unique" UNIQUE("profile_id","mes","anio")
);
--> statement-breakpoint
CREATE TABLE "cgbvp_company_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"estado" text,
	"bomberos_presentes" integer DEFAULT 0,
	"vehiculos_operativos" integer DEFAULT 0,
	"ultima_actualizacion" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cgbvp_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"estado_anterior" text,
	"estado_nuevo" text NOT NULL,
	"fuente" text DEFAULT 'scraper',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "codigo_cgbvp" varchar(20);--> statement-breakpoint
ALTER TABLE "emergencies" ADD CONSTRAINT "emergencies_tipo_emergencia_id_emergency_types_id_fk" FOREIGN KEY ("tipo_emergencia_id") REFERENCES "public"."emergency_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergencies" ADD CONSTRAINT "emergencies_al_mando_id_profiles_id_fk" FOREIGN KEY ("al_mando_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_crew_members" ADD CONSTRAINT "emergency_crew_members_emergency_id_emergencies_id_fk" FOREIGN KEY ("emergency_id") REFERENCES "public"."emergencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_crew_members" ADD CONSTRAINT "emergency_crew_members_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_crew_members" ADD CONSTRAINT "emergency_crew_members_vehicle_id_emergency_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."emergency_vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_vehicles" ADD CONSTRAINT "emergency_vehicles_emergency_id_emergencies_id_fk" FOREIGN KEY ("emergency_id") REFERENCES "public"."emergencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cgbvp_attendance" ADD CONSTRAINT "cgbvp_attendance_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cgbvp_status_history" ADD CONSTRAINT "cgbvp_status_history_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_codigo_cgbvp_unique" UNIQUE("codigo_cgbvp");