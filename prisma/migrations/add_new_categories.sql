-- Migration: Add new survey categories
-- Date: 2026-03-15

INSERT INTO "categories" ("id", "name", "description", "weight", "colorCode", "sortOrder", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'Work Management', 'Work management practices', 1.0, '#6366F1', 8, NOW(), NOW()),
  (gen_random_uuid()::text, 'Recognition', 'Employee recognition', 1.0, '#F97316', 9, NOW(), NOW()),
  (gen_random_uuid()::text, 'Trust and Respect', 'Trust and respect in the workplace', 1.0, '#06B6D4', 10, NOW(), NOW()),
  (gen_random_uuid()::text, 'Development', 'Professional development', 1.0, '#84CC16', 11, NOW(), NOW()),
  (gen_random_uuid()::text, 'Relationship', 'Workplace relationships', 1.0, '#E879F9', 12, NOW(), NOW()),
  (gen_random_uuid()::text, 'Empowerment', 'Employee empowerment', 1.0, '#F43F5E', 13, NOW(), NOW()),
  (gen_random_uuid()::text, 'No Category', 'Uncategorized questions', 1.0, '#9CA3AF', 14, NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;
