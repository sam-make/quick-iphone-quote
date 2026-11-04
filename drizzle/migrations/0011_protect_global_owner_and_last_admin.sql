CREATE FUNCTION public.guard_global_owner_role() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=NEW.user_id AND email='haddaouisamy86@gmail.com' AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Only verified owner may hold global role'; END IF; RETURN NEW; END; $$;
CREATE TRIGGER validate_global_owner BEFORE INSERT OR UPDATE ON public.global_user_roles FOR EACH ROW EXECUTE FUNCTION public.guard_global_owner_role();
CREATE FUNCTION public.guard_member_access() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE target_shop uuid; target_user uuid; BEGIN
IF TG_TABLE_NAME='user_roles' THEN target_shop:=OLD.shop_id; target_user:=OLD.user_id; ELSE target_shop:=OLD.shop_id; target_user:=OLD.id; END IF;
IF EXISTS (SELECT 1 FROM public.global_user_roles WHERE user_id=target_user) THEN
IF TG_OP='DELETE' OR (TG_TABLE_NAME='user_roles' AND to_jsonb(NEW)->>'role' IS DISTINCT FROM to_jsonb(OLD)->>'role') OR (TG_TABLE_NAME='profiles' AND NEW.suspended_at IS NOT NULL) THEN RAISE EXCEPTION 'Owner cannot be changed'; END IF;
END IF;
PERFORM 1 FROM public.shops WHERE id=target_shop FOR UPDATE;
IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=target_user AND shop_id=target_shop AND role='admin') AND (TG_OP='DELETE' OR (TG_TABLE_NAME='user_roles' AND to_jsonb(NEW)->>'role'='employee') OR (TG_TABLE_NAME='profiles' AND to_jsonb(NEW)->>'suspended_at' IS NOT NULL)) AND NOT EXISTS (SELECT 1 FROM public.profiles p JOIN public.user_roles r ON r.user_id=p.id AND r.shop_id=p.shop_id WHERE p.shop_id=target_shop AND p.id<>target_user AND p.suspended_at IS NULL AND r.role='admin') THEN RAISE EXCEPTION 'Last active administrator cannot be disabled'; END IF;
IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END; $$;
CREATE TRIGGER guard_member_role BEFORE UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.guard_member_access();
CREATE TRIGGER guard_member_profile BEFORE UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_member_access();