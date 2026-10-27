-- Toda conta tem telefone ou e-mail. O Prisma não expressa CHECK no schema.
-- Pré-requisito: nenhuma linha em users com phone nulo (users.email está todo nulo hoje).
ALTER TABLE "users" ADD CONSTRAINT "users_phone_or_email_check" CHECK ("phone" IS NOT NULL OR "email" IS NOT NULL);

-- E-mail sempre em minúsculas: o login com Google acha a conta por igualdade exata.
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase_check" CHECK ("email" = lower("email"));
