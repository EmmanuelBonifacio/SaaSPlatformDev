-- AlterTable
ALTER TABLE "modules" ADD COLUMN     "icone" TEXT;

-- AlterTable
ALTER TABLE "tenant_erp_parcelas" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_modules" ADD COLUMN     "beta" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bloqueado_motivo" TEXT,
ADD COLUMN     "em_breve" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trial_ate" TIMESTAMP(3),
ADD COLUMN     "visivel" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "em_trial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "plano_ate" TIMESTAMP(3),
ADD COLUMN     "plano_id" TEXT,
ADD COLUMN     "trial_dias" INTEGER NOT NULL DEFAULT 14;

-- CreateTable
CREATE TABLE "planos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "preco_mensal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "modulos" TEXT[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "planos_nome_key" ON "planos"("nome");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "planos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
