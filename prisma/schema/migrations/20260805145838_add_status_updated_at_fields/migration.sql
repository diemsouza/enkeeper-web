-- AlterTable: colunas novas, nullable por enquanto
ALTER TABLE "activities" ADD COLUMN "status_updated_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "status_updated_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "plan_code_updated_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "plan_status_updated_at" TIMESTAMP(3);

-- Backfill: updated_at como aproximacao para todo o dado historico
UPDATE "activities" SET "status_updated_at" = "updated_at";
UPDATE "users" SET
  "status_updated_at" = "updated_at",
  "plan_code_updated_at" = "updated_at",
  "plan_status_updated_at" = "updated_at";

-- AlterTable: agora que toda linha tem valor, torna obrigatorio e aplica o default
-- (DEFAULT bate com @default(now()) no schema, evita drift num proximo migrate dev)
ALTER TABLE "activities" ALTER COLUMN "status_updated_at" SET NOT NULL,
  ALTER COLUMN "status_updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "users" ALTER COLUMN "status_updated_at" SET NOT NULL,
  ALTER COLUMN "status_updated_at" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "plan_code_updated_at" SET NOT NULL,
  ALTER COLUMN "plan_code_updated_at" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "plan_status_updated_at" SET NOT NULL,
  ALTER COLUMN "plan_status_updated_at" SET DEFAULT CURRENT_TIMESTAMP;
