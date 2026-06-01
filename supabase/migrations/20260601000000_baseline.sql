


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."decrement_generation_credits"("user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_credits INTEGER;
BEGIN
  UPDATE public.profiles
  SET generation_credits = generation_credits - 1
  WHERE id = user_id AND generation_credits > 0
  RETURNING generation_credits INTO new_credits;

  RETURN COALESCE(new_credits, -1);
END;
$$;


ALTER FUNCTION "public"."decrement_generation_credits"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_generation_credits"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.profiles
  SET generation_credits = generation_credits + 1
  WHERE id = user_id;
END;
$$;


ALTER FUNCTION "public"."increment_generation_credits"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_privileged_profile_updates"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF current_role = 'authenticated' THEN
    IF NEW.generation_credits IS DISTINCT FROM OLD.generation_credits THEN
      RAISE EXCEPTION 'Cannot modify generation_credits directly';
    END IF;

    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Cannot modify role directly';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_privileged_profile_updates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."designs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "prompt" "text" NOT NULL,
    "product_type" "text",
    "style" "text",
    "image_url" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "image_status" "text" DEFAULT 'none'::"text" NOT NULL,
    "title" "text",
    "price_cents" integer,
    "placement" "jsonb",
    CONSTRAINT "designs_image_status_check" CHECK (("image_status" = ANY (ARRAY['none'::"text", 'generating'::"text", 'ready'::"text", 'failed'::"text"]))),
    CONSTRAINT "designs_price_cents_check" CHECK ((("price_cents" IS NULL) OR ("price_cents" >= 0))),
    CONSTRAINT "designs_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending_review'::"text", 'published'::"text"])))
);


ALTER TABLE "public"."designs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "buyer_id" "uuid",
    "design_id" "uuid" NOT NULL,
    "creator_id" "uuid",
    "quantity" integer NOT NULL,
    "size" "text" NOT NULL,
    "unit_price_cents" integer NOT NULL,
    "amount_total_cents" integer NOT NULL,
    "currency" "text" DEFAULT 'eur'::"text" NOT NULL,
    "platform_fee_cents" integer NOT NULL,
    "creator_earnings_cents" integer NOT NULL,
    "stripe_session_id" "text" NOT NULL,
    "stripe_payment_intent_id" "text",
    "shipping_name" "text" NOT NULL,
    "shipping_line1" "text" NOT NULL,
    "shipping_line2" "text",
    "shipping_city" "text" NOT NULL,
    "shipping_state" "text",
    "shipping_postal_code" "text" NOT NULL,
    "shipping_country" "text" NOT NULL,
    "status" "text" DEFAULT 'paid'::"text" NOT NULL,
    "tracking_number" "text",
    "fulfillment_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "paid_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "shipped_at" timestamp with time zone,
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['paid'::"text", 'fulfillment_pending'::"text", 'shipped'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "display_name" "text",
    "role" "text" DEFAULT 'buyer'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "generation_credits" integer DEFAULT 3 NOT NULL,
    "bio" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."public_profiles" AS
 SELECT "id",
    "display_name",
    "bio"
   FROM "public"."profiles";


ALTER VIEW "public"."public_profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."designs"
    ADD CONSTRAINT "designs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_stripe_session_id_key" UNIQUE ("stripe_session_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



CREATE INDEX "designs_creator_id_idx" ON "public"."designs" USING "btree" ("creator_id");



CREATE INDEX "designs_status_idx" ON "public"."designs" USING "btree" ("status");



CREATE INDEX "orders_buyer_id_idx" ON "public"."orders" USING "btree" ("buyer_id");



CREATE INDEX "orders_creator_id_idx" ON "public"."orders" USING "btree" ("creator_id");



CREATE INDEX "orders_design_id_idx" ON "public"."orders" USING "btree" ("design_id");



CREATE INDEX "orders_status_idx" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "orders_stripe_session_id_idx" ON "public"."orders" USING "btree" ("stripe_session_id");



CREATE OR REPLACE TRIGGER "designs_updated_at" BEFORE UPDATE ON "public"."designs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "enforce_profile_update_restrictions" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_privileged_profile_updates"();



ALTER TABLE ONLY "public"."designs"
    ADD CONSTRAINT "designs_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "public"."designs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "buyers_see_own_orders" ON "public"."orders" FOR SELECT USING (("buyer_id" = "auth"."uid"()));



CREATE POLICY "creator full access to own designs" ON "public"."designs" USING (("creator_id" = "auth"."uid"())) WITH CHECK (("creator_id" = "auth"."uid"()));



CREATE POLICY "creators_see_design_orders" ON "public"."orders" FOR SELECT USING (("creator_id" = "auth"."uid"()));



ALTER TABLE "public"."designs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "designs_admin_read" ON "public"."designs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "designs_admin_update" ON "public"."designs" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "published designs are publicly readable" ON "public"."designs" FOR SELECT USING (("status" = 'published'::"text"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."decrement_generation_credits"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_generation_credits"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_generation_credits"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_generation_credits"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_generation_credits"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_generation_credits"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_privileged_profile_updates"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_privileged_profile_updates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_privileged_profile_updates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."designs" TO "anon";
GRANT ALL ON TABLE "public"."designs" TO "authenticated";
GRANT ALL ON TABLE "public"."designs" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."public_profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."public_profiles" TO "anon";
GRANT SELECT ON TABLE "public"."public_profiles" TO "authenticated";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































