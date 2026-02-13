# Sanity → PostgreSQL Migration Guide

This guide explains how to migrate your existing surveys from Sanity CMS to the new PostgreSQL-based survey management system.

## Overview

The migration script will transfer:
- ✅ **Categories** (with weights, colors, descriptions)
- ✅ **Scales** (Likert 3-point, 5-point, etc.)
- ✅ **Surveys** (with all metadata)
- ✅ **Questions** (with question numbers, text, types, flags)
- ✅ **Category Mappings** (question → category associations)

---

## Prerequisites

1. **Sanity Environment Variables** must be set in `.env`:
   ```bash
   NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
   NEXT_PUBLIC_SANITY_DATASET=production
   SANITY_API_TOKEN=your_read_token
   ```

2. **PostgreSQL Database** must be running and accessible:
   ```bash
   DATABASE_URL=your_postgres_url
   ```

3. **Prisma schema** must be up-to-date:
   ```bash
   npm run db:generate
   ```

---

## Running the Migration

### Step 1: Backup Your Database (Recommended)

Before migrating, create a backup of your PostgreSQL database:

```bash
# Using pg_dump (if you have direct access)
pg_dump your_database > backup_before_migration.sql

# OR using Supabase dashboard
# Go to Database → Backups → Create Backup
```

### Step 2: Run the Migration Script

```bash
npm run db:migrate-sanity
```

### Step 3: Verify the Migration

The script will output:
```
✅ Migration completed successfully!

📊 Summary:
   - Categories: 7
   - Scales: 2
   - Surveys: 5
   - Questions: 175
```

Check the results in the admin panel:
1. Navigate to **https://www.drivemoreleads.co/admin/surveys**
2. Verify all surveys appear in the table
3. Click "Edit" on each survey to verify questions were migrated

---

## What Gets Migrated?

### 1. Categories
- ✅ Name, description, weight, color code, sort order
- ⚠️ **Duplicate prevention**: If a category with the same name already exists, it will be reused (not duplicated)

### 2. Scales
- ✅ Name, type (likert3, likert5), min/max values, labels
- ⚠️ **Duplicate prevention**: If a scale with the same name already exists, it will be reused

### 3. Surveys
- ✅ Title, description, type, number, status
- ✅ Scale association (if specified)
- ⚠️ **Duplicate prevention**: If a survey with the same title already exists, it will be skipped
- ℹ️ **SurveyJS schema** is initialized as empty `{}` (can be populated later)

### 4. Questions
- ✅ Question number, text, type, required flag, reversed flag
- ✅ Sort order (defaults to question number if not specified)
- ✅ SurveyJS name (`q1`, `q2`, etc.)
- ✅ Questions from both sections AND root level are migrated

### 5. Question-Category Mappings
- ✅ All category associations are preserved
- ✅ Multiple categories per question are supported

---

## Data Structure Differences

### Sanity (Old)
```
Survey
  └─ Sections (optional)
      └─ Questions
          └─ Categories (references)
  └─ Questions (root level, optional)
```

### PostgreSQL (New)
```
Survey
  └─ Questions (flat list, no sections)
      └─ QuestionCategory (join table)
          └─ Category
```

**Note:** Sections are flattened during migration. Questions from all sections are combined into a single flat list sorted by question number.

---

## Handling Edge Cases

### If Migration Fails Partway

The script is **NOT transactional** across all entities. If it fails:
1. Already-migrated categories/scales/surveys will remain in the database
2. Re-running the script will skip duplicates (based on name/title matching)
3. Check the error message to see where it failed
4. Fix the issue (e.g., missing scale reference, invalid data)
5. Re-run the migration

### If You Have Orphaned Data

After migration, you may want to clean up:

**Sanity (optional):**
- Surveys in Sanity will remain untouched
- You can delete them manually after verifying PostgreSQL data
- Or keep them as a backup

**PostgreSQL:**
- If you need to redo the migration, delete surveys first:
  ```sql
  DELETE FROM questions;
  DELETE FROM surveys;
  DELETE FROM categories;
  DELETE FROM scales;
  ```
- Then re-run the migration script

---

## Post-Migration Tasks

### 1. Update Campaign References

If you have existing campaigns that reference Sanity survey IDs, you'll need to update them:

```sql
-- Example: Update campaign survey references
UPDATE survey_campaigns
SET survey_id = (SELECT id FROM surveys WHERE title = 'Managerial Assessment')
WHERE survey_id = 'old-sanity-id';
```

### 2. Test Survey Rendering

1. Create a test campaign with each migrated survey
2. Generate an invitation token
3. Open the survey URL (`/s/[token]`)
4. Verify all questions render correctly
5. Submit a test response

### 3. Verify Scoring

1. Submit multiple test responses
2. Generate a report
3. Verify category scores are calculated correctly
4. Check that weighted scoring is applied (for Surveys 6 & 7)
5. Verify anonymity is enforced (for Survey 7)

---

## Troubleshooting

### Error: "Cannot find module '@sanity/client'"

Install Sanity client:
```bash
npm install @sanity/client
```

### Error: "Invalid Sanity credentials"

Check your `.env` file:
- `NEXT_PUBLIC_SANITY_PROJECT_ID` should match your Sanity project
- `SANITY_API_TOKEN` should have read permissions
- `NEXT_PUBLIC_SANITY_DATASET` should be `production` (or your dataset name)

### Error: "Foreign key constraint violation"

This means a question references a category or scale that doesn't exist:
1. Run the migration with verbose logging enabled
2. Identify the missing reference
3. Either create the missing entity in Sanity, or remove the reference
4. Re-run the migration

### Questions Are Missing

Check if:
1. Questions were nested in sections → they should be migrated
2. Questions had invalid references → check script logs for errors
3. Questions were in a different dataset → verify `NEXT_PUBLIC_SANITY_DATASET`

### Duplicate Surveys Created

The script checks for duplicates by **title**. If you have multiple surveys with the same title in Sanity:
1. Rename them in Sanity to unique titles
2. Delete duplicates from PostgreSQL
3. Re-run the migration

---

## Need Help?

If you encounter issues:
1. Check the script output for detailed error messages
2. Review this guide's troubleshooting section
3. Check database logs for constraint violations
4. Verify your `.env` configuration
5. Test with a single survey first (comment out the loop in the script)

---

## Migration Checklist

- [ ] Backup PostgreSQL database
- [ ] Verify Sanity credentials in `.env`
- [ ] Run `npm run db:migrate-sanity`
- [ ] Verify surveys appear in admin panel
- [ ] Test survey rendering with test token
- [ ] Submit test responses
- [ ] Verify scoring and reports
- [ ] Update campaign references (if applicable)
- [ ] Clean up Sanity data (optional)
- [ ] Commit migration results to git

---

**Last Updated:** 2026-02-13
