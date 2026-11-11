-- Starting values for the automatic commission rules (admins can change them in /admin/commissions)
UPDATE "CommissionRule" SET "pct" = 0.5 WHERE "title" = 'საწვავი და დაბალმარჟიანი პროდუქტი' AND "pct" IS NULL;
UPDATE "CommissionRule" SET "pct" = 2, "isDefault" = true WHERE "title" = 'სტანდარტული B2B სერვისი' AND "pct" IS NULL;
UPDATE "CommissionRule" SET "pct" = 4 WHERE "title" = 'პროფესიული მაღალი მარჟა' AND "pct" IS NULL;
UPDATE "CommissionRule" SET "pct" = 1, "minAmount" = 100000, "capAmount" = 5000 WHERE "title" = 'დიდი კორპორაციული გარიგება' AND "pct" IS NULL;
