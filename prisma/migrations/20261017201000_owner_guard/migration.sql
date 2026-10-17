-- OWNER qatorini himoyalash: faqat recovery skript (app.allow_owner_write=on) o'zgartira oladi
CREATE OR REPLACE FUNCTION protect_owner_user() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."role" = 'OWNER' AND current_setting('app.allow_owner_write', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'OWNER akkauntini o''chirib bo''lmaydi';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD."role" = 'OWNER' AND current_setting('app.allow_owner_write', true) IS DISTINCT FROM 'on' THEN
    IF NEW."role" <> 'OWNER' THEN
      RAISE EXCEPTION 'OWNER rolini pasaytirib bo''lmaydi';
    END IF;
    IF OLD."isActive" = true AND NEW."isActive" = false THEN
      RAISE EXCEPTION 'OWNER akkauntini faolsizlantirib bo''lmaydi';
    END IF;
    IF NEW."passwordHash" IS DISTINCT FROM OLD."passwordHash" THEN
      RAISE EXCEPTION 'OWNER parolini faqat recovery orqali o''zgartirish mumkin';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_owner_user_trigger ON "User";
CREATE TRIGGER protect_owner_user_trigger
  BEFORE UPDATE OR DELETE ON "User"
  FOR EACH ROW EXECUTE FUNCTION protect_owner_user();
