-- Oylik modulida "Usaqlar" (deduction) sozlamasi yo'q — maydon olib tashlanadi.
--
-- `total` endi `baseAmount + bonusAmount` ga teng. Oldingi `deductionAmount`
-- qiymatlari nolga tushiriladi va `total` qayta hisoblanadi, chunki aks
-- holda jami eski deduction bilan qolib ketar edi.
UPDATE "SalaryRecord"
SET "deductionAmount" = 0,
    total = "baseAmount" + "bonusAmount";

-- AlterTable
ALTER TABLE "SalaryRecord" DROP COLUMN "deductionAmount";
