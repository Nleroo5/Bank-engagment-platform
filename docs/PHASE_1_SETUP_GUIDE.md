# Phase 1: Foundation & Data Setup - Complete Guide

**Status:** ✅ Schema updates complete, ready for data population
**Date:** 2026-02-07

---

## What Was Done in Phase 1

### 1. Schema Updates ✅

#### Sanity Category Schema

- Added `weight` field (number, required, default 1.0)
- Validation: min 0.1, max 10, precision 2 decimal places
- Updated preview to show weight in Sanity Studio UI
- Location: [sanity/schemas/category.ts](../sanity/schemas/category.ts)

#### TypeScript Types

- Added `weight: number` to `Category` interface
- Location: [src/types/survey.ts](../src/types/survey.ts)

#### GROQ Queries

- Updated `CATEGORY_FRAGMENT` to include weight field
- Updated `getAllCategories()` query
- Updated `getCategoriesForSurvey()` query
- Location: [src/lib/sanity/queries.ts](../src/lib/sanity/queries.ts)

### 2. Reference Documentation ✅

Created definitive reference: [docs/SCORING_MATRIX_REFERENCE.md](./SCORING_MATRIX_REFERENCE.md)

**Exact category weights from client scoring matrix:**

- Communication: **1.75**
- Leadership: **1.0**
- Culture: **2.3**
- Accountability: **1.7**
- Execution: **1.4**
- Associate: **1.4**
- Team Dynamics: **1.4**

### 3. Automation Scripts ✅

#### Population Script

- **File:** `scripts/populate-category-weights.ts`
- **Purpose:** Automatically updates all categories with correct weights
- **Run with:** `npm run sanity:populate-weights`

#### Verification Script

- **File:** `scripts/verify-question-mappings.ts`
- **Purpose:** Verifies all 35 questions map to correct categories
- **Run with:** `npm run sanity:verify-mappings`

### 4. Package Updates ✅

- Added `dotenv` dependency for scripts
- Added npm scripts:
  - `npm run sanity:populate-weights`
  - `npm run sanity:verify-mappings`

---

## Next Steps: Running the Setup

### Prerequisites

1. **Sanity Studio must be running:**

   ```bash
   npm run sanity:dev
   ```

2. **Environment variables must be set** (in `.env.local` or `.env`):

   ```env
   NEXT_PUBLIC_SANITY_PROJECT_ID=4z8cbios
   NEXT_PUBLIC_SANITY_DATASET=production
   SANITY_API_TOKEN=your-token-here  # Must have WRITE permissions
   ```

3. **The 7 categories must exist in Sanity** (created manually via Sanity Studio)

### Step-by-Step Setup

#### Step 1: Install Dependencies

```bash
npm install
```

This will install the new `dotenv` dependency.

#### Step 2: Create Categories in Sanity Studio (if not already done)

1. Open Sanity Studio: `npm run sanity:dev` (opens at http://localhost:3333)
2. Navigate to "Category" document type
3. Create 7 categories with these EXACT names:
   - Communication
   - Leadership
   - Culture
   - Accountability
   - Execution
   - Associate
   - Team Dynamics

**Optional but recommended fields:**

- `colorCode`: Set hex colors matching paper forms
- `description`: Brief description of category

**Don't set these manually:**

- `weight`: Will be set by populate script
- `sortOrder`: Will be set by populate script

#### Step 3: Populate Category Weights

```bash
npm run sanity:populate-weights
```

**What this does:**

- Connects to your Sanity project
- Finds all 7 categories
- Sets the correct `weight` and `sortOrder` values
- Shows before/after comparison
- Exits with error if any categories are missing

**Expected output:**

```
🚀 Starting category weights population script...
📡 Connecting to Sanity project: 4z8cbios
✅ Found 7 existing categories

🔄 Updating categories with correct weights...
✓ Communication          | Updated to ×1.75 (sort: 1)
✓ Leadership             | Updated to ×1.0 (sort: 2)
✓ Culture                | Updated to ×2.3 (sort: 3)
✓ Accountability         | Updated to ×1.7 (sort: 4)
✓ Execution              | Updated to ×1.4 (sort: 5)
✓ Associate              | Updated to ×1.4 (sort: 6)
✓ Team Dynamics          | Updated to ×1.4 (sort: 7)

🎉 SUCCESS! All category weights are now correctly configured.
```

#### Step 4: Create Survey and Questions in Sanity (if not already done)

1. Create the **Managerial Assessment** survey:
   - Title: "Managerial Assessment"
   - Slug: `managerial-assessment`
   - Survey Number: 6
   - Survey Type: "Likert 3-Point"

2. Create sections and questions:
   - Total: 35 questions numbered 1-35
   - Each question must reference the correct category
   - Mark reverse-scored questions with `isReversed: true`
   - See [SCORING_MATRIX_REFERENCE.md](./SCORING_MATRIX_REFERENCE.md) for exact mappings

#### Step 5: Verify Question Mappings

```bash
npm run sanity:verify-mappings
```

**What this does:**

- Fetches the Managerial Assessment survey from Sanity
- Compares actual question-category mappings against expected mappings
- Reports any mismatches, missing questions, or orphaned questions
- Shows reverse-scored questions summary

**Expected output if all correct:**

```
🔍 Starting question-category mapping verification...
✅ Found survey: Managerial Assessment (Survey 6)
📝 Total questions found: 35

Communication
────────────────────────────────────────────────────────────────────────────────
Expected (4): [6, 13, 20, 26]
Actual   (4): [6, 13, 20, 26]
Status: ✅ MATCH

[... 6 more categories ...]

✅ ALL VERIFICATIONS PASSED
🎉 Survey is ready for weighted scoring implementation!
```

**If there are errors:**
The script will show exactly which questions are in the wrong categories, which are missing, etc. Fix these in Sanity Studio and re-run.

---

## Troubleshooting

### Error: "SANITY_API_TOKEN not found"

**Solution:** Add your Sanity API token to `.env.local`:

1. Go to https://www.sanity.io/manage
2. Select your project (4z8cbios)
3. Go to API → Tokens
4. Create a new token with **Editor** or **Administrator** permissions
5. Add to `.env.local`:
   ```env
   SANITY_API_TOKEN=skAbcd1234...
   ```

### Error: "Category not found in Sanity"

**Solution:** Create the missing categories in Sanity Studio first, then re-run the populate script.

### Error: "Survey 'managerial-assessment' not found"

**Solution:** Check the slug in Sanity Studio:

1. Open the survey document
2. Check the slug field
3. If different, update `SURVEY_SLUG` constant in `scripts/verify-question-mappings.ts`

### Warning: Question count mismatch

**Solution:** Ensure exactly 35 questions exist in the survey, numbered 1-35 with no gaps or duplicates.

---

## Validation Checklist

Before moving to Phase 2, verify:

- [ ] `npm install` completed successfully
- [ ] All 7 categories exist in Sanity with correct weights
- [ ] `npm run sanity:populate-weights` completed successfully
- [ ] Managerial Assessment survey exists with slug `managerial-assessment`
- [ ] All 35 questions are created in Sanity
- [ ] `npm run sanity:verify-mappings` reports "ALL VERIFICATIONS PASSED"
- [ ] No errors or warnings in script output

---

## Files Modified/Created in Phase 1

### Modified

- `sanity/schemas/category.ts` - Added weight field
- `src/types/survey.ts` - Added weight to Category interface
- `src/lib/sanity/queries.ts` - Updated queries to fetch weight
- `package.json` - Added scripts and dotenv dependency

### Created

- `docs/SCORING_MATRIX_REFERENCE.md` - Official reference document
- `docs/PHASE_1_SETUP_GUIDE.md` - This file
- `scripts/populate-category-weights.ts` - Weight population script
- `scripts/verify-question-mappings.ts` - Verification script

---

## Ready for Phase 2?

Once all validation checks pass, Phase 1 is complete. The foundation is ready for:

- **Phase 2:** Scoring engine implementation
- **Phase 3:** Database enhancements for adjusted values
- **Phase 4:** API updates for weighted reports
- **Phase 5:** UI components and visualizations

**Next command:** Proceed to Phase 2 implementation when ready.
