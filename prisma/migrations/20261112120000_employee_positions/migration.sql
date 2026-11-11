-- Employee position / department (admin-managed lists stored as Category kind POSITION / DEPARTMENT)
ALTER TABLE "CompanyMember" ADD COLUMN "positionId" TEXT, ADD COLUMN "departmentId" TEXT;
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompanyMember" ADD CONSTRAINT "CompanyMember_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "CompanyMember_positionId_idx" ON "CompanyMember"("positionId");

ALTER TABLE "CompanyInvitation" ADD COLUMN "firstName" TEXT, ADD COLUMN "lastName" TEXT, ADD COLUMN "positionId" TEXT, ADD COLUMN "departmentId" TEXT;

ALTER TABLE "CampaignRequest" ADD COLUMN "positionIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Starter lists (admin can rename / add / hide them in /admin/categories)
INSERT INTO "Category" ("id", "name", "slug", "kind", "sortOrder", "isActive", "createdAt", "updatedAt") VALUES
  ('pos_ceo',        'დირექტორი / აღმასრულებელი დირექტორი', 'pos-ceo',        'POSITION', 10,  true, now(), now()),
  ('pos_founder',    'დამფუძნებელი / მეწილე',               'pos-founder',    'POSITION', 20,  true, now(), now()),
  ('pos_hr_head',    'HR ხელმძღვანელი',                       'pos-hr-head',    'POSITION', 30,  true, now(), now()),
  ('pos_hr',         'HR მენეჯერი',                           'pos-hr',         'POSITION', 40,  true, now(), now()),
  ('pos_cfo',        'ფინანსური დირექტორი',                   'pos-cfo',        'POSITION', 50,  true, now(), now()),
  ('pos_accountant', 'ბუღალტერი',                             'pos-accountant', 'POSITION', 60,  true, now(), now()),
  ('pos_procurement','შესყიდვების მენეჯერი',                  'pos-procurement','POSITION', 70,  true, now(), now()),
  ('pos_sales',      'გაყიდვების მენეჯერი',                   'pos-sales',      'POSITION', 80,  true, now(), now()),
  ('pos_marketing',  'მარკეტინგის მენეჯერი',                  'pos-marketing',  'POSITION', 90,  true, now(), now()),
  ('pos_admin',      'ოფის-მენეჯერი / ადმინისტრატორი',        'pos-admin',      'POSITION', 100, true, now(), now()),
  ('pos_it',         'IT მენეჯერი',                           'pos-it',         'POSITION', 110, true, now(), now()),
  ('pos_logistics',  'ლოჯისტიკის მენეჯერი',                   'pos-logistics',  'POSITION', 120, true, now(), now()),
  ('pos_legal',      'იურისტი',                               'pos-legal',      'POSITION', 130, true, now(), now()),
  ('pos_specialist', 'სპეციალისტი',                           'pos-specialist', 'POSITION', 140, true, now(), now()),
  ('dep_management', 'ხელმძღვანელობა',  'dep-management', 'DEPARTMENT', 10,  true, now(), now()),
  ('dep_hr',         'HR',              'dep-hr',         'DEPARTMENT', 20,  true, now(), now()),
  ('dep_finance',    'ფინანსები',       'dep-finance',    'DEPARTMENT', 30,  true, now(), now()),
  ('dep_procurement','შესყიდვები',      'dep-procurement','DEPARTMENT', 40,  true, now(), now()),
  ('dep_sales',      'გაყიდვები',       'dep-sales',      'DEPARTMENT', 50,  true, now(), now()),
  ('dep_marketing',  'მარკეტინგი',      'dep-marketing',  'DEPARTMENT', 60,  true, now(), now()),
  ('dep_admin',      'ადმინისტრაცია',   'dep-admin',      'DEPARTMENT', 70,  true, now(), now()),
  ('dep_it',         'IT',              'dep-it',         'DEPARTMENT', 80,  true, now(), now()),
  ('dep_logistics',  'ლოჯისტიკა',       'dep-logistics',  'DEPARTMENT', 90,  true, now(), now()),
  ('dep_legal',      'იურიდიული',       'dep-legal',      'DEPARTMENT', 100, true, now(), now()),
  ('dep_operations', 'ოპერაციები',      'dep-operations', 'DEPARTMENT', 110, true, now(), now())
ON CONFLICT ("slug") DO NOTHING;
