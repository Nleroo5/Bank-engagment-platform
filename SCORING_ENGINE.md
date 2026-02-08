# Scoring Engine Documentation ✅

## Overview

Built a comprehensive scoring engine that calculates survey scores at multiple levels (question, category, section, survey, campaign) with support for reverse scoring and anonymity protection for Survey 7 (Associate 180).

## Created Files

### Core Scoring Functions

1. **[src/lib/scoring/calculate.ts](src/lib/scoring/calculate.ts)** - Core scoring calculations
2. **[src/lib/scoring/anonymity.ts](src/lib/scoring/anonymity.ts)** - Anonymity threshold enforcement

### Configuration

3. **[vitest.config.ts](vitest.config.ts)** - Vitest test configuration

### Tests

4. **[src/lib/scoring/**tests**/calculate.test.ts](src/lib/scoring/**tests**/calculate.test.ts)** - Comprehensive unit tests (31 tests, all passing)

## Core Functions

### calculate.ts

#### `calculateQuestionScore(rawValue, isReversed, scaleMax)`

Calculates the adjusted score for a single question response.

**Reverse Scoring Formula:** `adjustedScore = (scaleMax + 1) - rawValue`

**Examples:**

- **5-point scale (1-5):**
  - Normal: raw 1 → adjusted 1, raw 5 → adjusted 5
  - Reversed: raw 1 → adjusted 5, raw 5 → adjusted 1
- **3-point scale (1-3):**
  - Normal: raw 1 → adjusted 1, raw 3 → adjusted 3
  - Reversed: raw 1 → adjusted 3, raw 3 → adjusted 1

**Usage:**

```typescript
// Normal scoring
const score = calculateQuestionScore(5, false, 5); // Returns 5

// Reverse scoring (Survey 6 & 7)
const score = calculateQuestionScore(1, true, 3); // Returns 3
```

#### `calculateCategoryScores(responses, questions, scaleMax)`

Calculates average scores grouped by the 7 categories:

- Communication
- Leadership
- Culture
- Accountability
- Execution
- Associate
- Team Dynamics

**CRITICAL Rules:**

- ✅ Never averages averages — always aggregates from individual response values
- ✅ Applies reverse scoring before averaging
- ✅ Rounds all averages to 1 decimal place: `Math.round(score * 10) / 10`
- ✅ Ignores responses with `null` values
- ✅ Sorts categories alphabetically by name

**Returns:**

```typescript
{
  categoryId: string;
  categoryName: string;
  averageScore: number; // Rounded to 1 decimal
  questionCount: number; // Unique questions in category
  responseCount: number; // Total responses (can be > questionCount)
}
[];
```

#### `calculateSectionScores(responses, questions, scaleMax)`

Calculates average scores grouped by survey sections (e.g., Goal Setting, Roles, Interpersonal Relationships).

**Returns:**

```typescript
{
  sectionId: string;
  sectionTitle: string;
  averageScore: number; // Rounded to 1 decimal
  questionCount: number;
  responseCount: number;
}
[];
```

#### `calculateSurveyScore(responses, questions, scaleMax)`

Calculates the overall survey score with category and section breakdowns.

**Returns:**

```typescript
{
  averageScore: number;           // Rounded to 1 decimal
  totalQuestions: number;
  totalResponses: number;
  categoryScores: CategoryScore[];
  sectionScores: SectionScore[];
}
```

#### `calculateCampaignScores(campaignId, questions, scaleMax)`

Aggregates scores for an entire campaign across all completed respondents.

**CRITICAL:** Fetches all individual responses from completed invitations and aggregates from raw values — never averages pre-calculated averages.

**Returns:**

```typescript
{
  campaignId: string;
  respondentCount: number; // Completed invitations
  completionRate: number; // Rounded to 1 decimal
  surveyScore: SurveyScore; // Full breakdown
}
```

**Usage:**

```typescript
import { getSurveyById } from '@/lib/sanity';
import { calculateCampaignScores } from '@/lib/scoring/calculate';

const survey = await getSurveyById(campaign.sanitysurveyId);
const questions = survey.sections.flatMap((s) => s.questions);
const scaleMax = survey.surveyType === 'managerial' ? 3 : 5;

const scores = await calculateCampaignScores(campaign.id, questions, scaleMax);
```

### anonymity.ts

#### `checkAnonymityThreshold(campaignId, surveyType)`

Checks if a campaign has enough completed respondents to meet the anonymity threshold.

**CRITICAL:** For Survey 7 (Associate 180), individual responses are NEVER visible. Reports require a minimum of 5 respondents before generating any aggregated data.

**Returns:** `true` if campaign meets threshold (or doesn't require it)

**Usage:**

```typescript
const meetsThreshold = await checkAnonymityThreshold(
  campaign.id,
  'associate-180'
);

if (!meetsThreshold) {
  return { error: 'Minimum 5 respondents required for this report' };
}
```

#### `getFilterableOptions(campaignId, surveyType, currentFilters)`

Gets demographic filter options that maintain the anonymity threshold.

**CRITICAL:** When filtering demographics, ensure the resulting pool never drops below 5 respondents. Only returns filter options where the count >= 5.

**Returns:**

```typescript
{
  divisions: DemographicFilter[];
  jobRoles: DemographicFilter[];
  genders: DemographicFilter[];
  timeAtBank: DemographicFilter[];
}

interface DemographicFilter {
  field: string;
  label: string;
  value: string;
  count: number;  // Number of respondents with this value
}
```

**Usage:**

```typescript
const filterOptions = await getFilterableOptions(campaign.id, 'associate-180');

// Only shows divisions with >= 5 respondents
console.log(filterOptions.divisions);
// [
//   { field: 'division', label: 'Division: Technology', value: 'Technology', count: 12 },
//   { field: 'division', label: 'Division: Operations', value: 'Operations', count: 8 }
// ]
```

#### `validateFilteredAnonymity(campaignId, surveyType, filters)`

Validates that applying a set of filters maintains the anonymity threshold.

**Returns:**

```typescript
{
  valid: boolean; // True if filtered pool meets threshold
  count: number; // Actual count after filtering
}
```

**Usage:**

```typescript
const result = await validateFilteredAnonymity(campaign.id, 'associate-180', {
  division: 'Technology',
  gender: 'FEMALE',
});

if (!result.valid) {
  return {
    error: `Only ${result.count} respondents match these filters. Minimum 5 required.`,
  };
}
```

## Constants

```typescript
export const ANONYMITY_THRESHOLD = 5;
export const ANONYMOUS_SURVEY_TYPES = ['associate-180', 'survey-7'];
```

## Reverse Scoring Implementation

### Which Surveys Use Reverse Scoring?

- ✅ **Survey 6** (Managerial Assessment) - 3-point scale
- ✅ **Survey 7** (Associate 180) - 3-point scale
- ❌ **Survey 4** (Leadership Team Effectiveness) - 5-point scale, no reverse
- ❌ **Survey 5** (Operational Team Effectiveness) - 5-point scale, no reverse

### How to Mark Questions as Reversed in Sanity

When creating questions in Sanity, add a boolean field `isReversed`:

```javascript
{
  name: 'isReversed',
  title: 'Is Reverse Scored',
  type: 'boolean',
  description: 'If true, scoring is inverted (e.g., 1 becomes 3, 3 becomes 1)',
  initialValue: false
}
```

### Data Flow

1. **Survey Response Submission:**
   - Store RAW value as selected by respondent
   - Database stores: `{ value: 1 }` (even if reversed)

2. **Score Calculation:**
   - Fetch question metadata from Sanity
   - Check `isReversed` flag
   - Apply formula: `adjustedValue = isReversed ? (scaleMax + 1 - rawValue) : rawValue`
   - Use adjusted value for all averages

3. **Admin Reports:**
   - Show both raw and adjusted values for transparency
   - Use adjusted values for all scoring visualizations

## Test Coverage

### 31 Unit Tests, All Passing ✅

**calculateQuestionScore:**

- ✅ 5-point scale normal scoring (5 tests)
- ✅ 5-point scale reverse scoring (6 tests)
- ✅ 3-point scale normal scoring (3 tests)
- ✅ 3-point scale reverse scoring (4 tests)
- ✅ Edge cases and custom scale values (2 tests)

**calculateCategoryScores:**

- ✅ Basic category grouping and averaging (1 test)
- ✅ Reverse scoring application (1 test)
- ✅ Decimal rounding to 1 place (1 test)
- ✅ Null value handling (1 test)
- ✅ Alphabetical sorting (1 test)

**calculateSectionScores:**

- ✅ Basic section grouping and averaging (1 test)
- ✅ Reverse scoring application (1 test)

**calculateSurveyScore:**

- ✅ Overall average calculation (1 test)
- ✅ Category and section breakdowns (1 test)
- ✅ Decimal rounding (1 test)
- ✅ Empty responses handling (1 test)

### Run Tests

```bash
npm run test                # Run all tests
npm run test:watch          # Watch mode for development
```

**Results:**

```
✓ src/lib/scoring/__tests__/calculate.test.ts (31 tests) 20ms

Test Files  1 passed (1)
     Tests  31 passed (31)
  Duration  501ms
```

## Build Status

```bash
npm run build
✓ Compiled successfully
✓ All 21 routes built
```

## Usage Examples

### Example 1: Calculate Scores for a Completed Campaign

```typescript
import { prisma } from '@/lib/prisma';
import { getSurveyById } from '@/lib/sanity';
import { calculateCampaignScores } from '@/lib/scoring/calculate';

// In an API route: /api/campaigns/[id]/scores
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaign = await prisma.surveyCampaign.findUnique({
    where: { id: params.id },
  });

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  // Fetch survey structure from Sanity
  const survey = await getSurveyById(campaign.sanitysurveyId);

  // Flatten questions from all sections
  const questions = survey.sections.flatMap((section) =>
    section.questions.map((q) => ({
      _id: q._id,
      questionNumber: q.questionNumber,
      isReversed: q.isReversed,
      category: q.category,
      section: { _id: section._id, title: section.title },
    }))
  );

  // Determine scale max based on survey type
  const scaleMax =
    survey.surveyType === 'managerial' || survey.surveyType === 'associate-180'
      ? 3
      : 5;

  // Calculate all scores
  const scores = await calculateCampaignScores(
    campaign.id,
    questions,
    scaleMax
  );

  return NextResponse.json(scores);
}
```

### Example 2: Check Anonymity Before Showing Report

```typescript
import { checkAnonymityThreshold } from '@/lib/scoring/anonymity';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaign = await prisma.surveyCampaign.findUnique({
    where: { id: params.id },
  });

  const survey = await getSurveyById(campaign.sanitysurveyId);

  // Check if survey requires anonymity and meets threshold
  const meetsThreshold = await checkAnonymityThreshold(
    campaign.id,
    survey.surveyType
  );

  if (!meetsThreshold) {
    return NextResponse.json(
      {
        error: 'Insufficient respondents for this report',
        message:
          'This survey requires a minimum of 5 completed responses before viewing results to protect respondent anonymity.',
      },
      { status: 403 }
    );
  }

  // Proceed with score calculation...
}
```

### Example 3: Get Safe Demographic Filters

```typescript
import { getFilterableOptions } from '@/lib/scoring/anonymity';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaign = await prisma.surveyCampaign.findUnique({
    where: { id: params.id },
  });

  const survey = await getSurveyById(campaign.sanitysurveyId);

  // Get only filters that maintain anonymity
  const filterOptions = await getFilterableOptions(
    campaign.id,
    survey.surveyType
  );

  return NextResponse.json({
    message: 'Only showing demographic filters with 5+ respondents',
    filters: filterOptions,
  });
}
```

## Critical Rules Summary

### ✅ NEVER Average Averages

Always aggregate from individual response values. Never calculate:

```typescript
// ❌ WRONG
const categoryAverage = (respondent1Avg + respondent2Avg) / 2;

// ✅ CORRECT
const allValues = [...respondent1Values, ...respondent2Values];
const categoryAverage = sum(allValues) / allValues.length;
```

### ✅ Always Round to 1 Decimal Place

```typescript
Math.round(score * 10) / 10;
```

### ✅ Enforce 5 Respondent Minimum for Survey 7

```typescript
if (surveyType === 'associate-180' && completedCount < 5) {
  // Block access to individual or aggregated data
}
```

### ✅ Apply Reverse Scoring at Calculation Time

Store raw values in database, apply reverse scoring formula when calculating scores.

### ✅ Include Both Raw and Adjusted in Admin Views

For transparency, show admins both the raw value (what respondent selected) and adjusted value (used for scoring).

## Next Steps

### API Routes to Build

1. **GET `/api/campaigns/[id]/scores`** - Get campaign scores
2. **GET `/api/reports/[id]`** - Generate detailed report with demographic filters
3. **GET `/api/reports/[id]/filters`** - Get available demographic filters

### Admin UI to Build

1. **Campaign Scores Dashboard** - Visual charts with category breakdowns
2. **Demographic Filter UI** - Dropdowns with counts, disabled if < 5
3. **Export Reports** - Excel/PDF with full score breakdowns

### Database Considerations

- Consider caching calculated scores in a `campaign_scores` table for performance
- Recalculate when new responses are submitted
- Mark stale if campaign is still active

---

**Scoring engine is production-ready!** 🎉

All calculations follow the strict rules: never averaging averages, always rounding to 1 decimal place, enforcing anonymity thresholds, and correctly applying reverse scoring for Surveys 6 and 7.
