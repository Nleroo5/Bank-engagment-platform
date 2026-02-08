# Demographics Survey - Implementation Guide

## Overview

The Demographics survey is Survey #1 in the Bank Engagement Platform. It collects basic employee and organizational information once per survey cycle.

## Survey Structure

**Survey ID:** `demographics`
**Survey Number:** 1
**Survey Type:** `demographics`
**Estimated Time:** 5 minutes
**Total Questions:** 13

## Questions & Field Types

| #   | Question                   | Field Type         | Input Type                         |
| --- | -------------------------- | ------------------ | ---------------------------------- |
| 1   | Name of Bank               | `bankName`         | Text Input                         |
| 2   | Location - Country         | `country`          | Dropdown                           |
| 3   | Location - State           | `state`            | Dropdown                           |
| 4   | Location - Metro City Area | `metro`            | Text Input                         |
| 5   | Location - City            | `city`             | Text Input                         |
| 6   | Size of Bank               | `bankSize`         | Radio Buttons (12 options)         |
| 7   | Device Used for Survey     | `device`           | Radio Buttons (3 options)          |
| 8   | Employment Status          | `employmentStatus` | Radio Buttons (3 options)          |
| 9   | Gender                     | `gender`           | Radio Buttons (3 options)          |
| 10  | Time at Bank               | `timeAtBank`       | Radio Buttons (4 options)          |
| 11  | Bank Experience            | `bankExperience`   | Radio Buttons (4 options)          |
| 12  | Bank Division              | `division`         | Radio Buttons (11 options + Other) |
| 13  | Job Role                   | `jobRole`          | Radio Buttons (16 options + Other) |

## Field Options

### Bank Size (12 ranges)

- Less than $100M
- $100M - $250M
- $250M - $500M
- $500M - $750M
- $750M - $1B
- $1B - $2.5B
- $2.5B - $5B
- $5B - $7.5B
- $7.5B - $10B
- $10B - $12.5B
- $12.5B - $20B
- Greater than $20B

### Device Used

- Desktop/Laptop
- Tablet
- Mobile Phone

### Employment Status

- Full-Time
- Part-Time
- Peak-Time

### Gender

- Female
- Male
- Other

### Time at Bank

- Less than 1 year
- 1-5 years
- 6-10 years
- More than 10 years

### Bank Experience

- Less than 1 year
- 1-10 years
- 11-20 years
- More than 20 years

### Bank Division (11 + Other)

- Administration
- Commercial Banking
- Credit Department
- Information Systems / Technology (IS/Tech)
- Operations
- Retail
- Sales/Marketing
- Special Banking
- Trust
- Wealth Management
- Other (with text input)

### Job Role (16 + Other)

- Branch Staff
- Branch Manager
- Call Center Operations
- CEO/Executive
- Coach/Mentor/Trainer
- Executive Management
- Finance
- Human Resources/Trainers
- Loan Administration
- Operations Staff
- Marketing/Sales Manager
- Relationship Manager
- Risk
- Supervisory Staff
- Technology Staff
- Other (with text input)

## Technical Implementation

### Components

**Primary Component:** [`DemographicsField.tsx`](../src/components/survey/DemographicsField.tsx)

This component handles all demographics input types:

- Text inputs (bankName, city, metro)
- Dropdowns (country, state)
- Radio button groups with "Other" support (division, jobRole)
- Radio button groups (all other fields)

### Data Storage

Demographics responses are stored in the `responses` table with:

- `textValue` field for all responses (since they're all text-based)
- `value` field is `null` for demographics (only used for Likert scales)

Some fields automatically update the `users` table:

- `division` → `users.division`
- `jobRole` → `users.jobRole`
- `employmentStatus` → `users.employmentStatus`
- `gender` → `users.gender`
- `timeAtBank` → `users.timeAtBank`
- `bankExperience` → `users.bankExperience`

### Sanity CMS Structure

**Schema Files:**

- [question.ts](../sanity/schemas/question.ts) - Added `fieldType` field
- [survey.ts](../sanity/schemas/survey.ts) - Supports `demographics` type

**Creation Script:**

- [create-demographics-survey.ts](../scripts/create-demographics-survey.ts)

## Usage

### Creating a Demographics Campaign

1. **In Sanity Studio:**
   - Navigate to Surveys
   - Find "Employee Demographics"
   - Verify all questions are configured correctly

2. **In Admin Dashboard:**
   - Go to Campaigns → Create Campaign
   - Select "Employee Demographics" survey
   - Set start/end dates
   - Add respondents
   - Send invitations

3. **Respondent Experience:**
   - Receives email with unique survey link
   - Clicks link → sees welcome screen
   - Fills out 13 demographic questions
   - Submits survey
   - Data is saved and user profile is updated

### API Endpoints

**Save Response (Auto-save):**

```typescript
PATCH /api/responses
Body: {
  token: string,
  questionId: string,
  value: string  // Always string for demographics
}
```

**Submit Survey:**

```typescript
POST / api / responses / submit;
Body: {
  token: string;
}
```

## Testing

To test the demographics survey:

1. **Create a test campaign:**

   ```bash
   # In admin dashboard
   Create Campaign → Select "Employee Demographics"
   ```

2. **Access the survey:**

   ```bash
   # Use the generated token URL
   http://localhost:3000/s/[TOKEN]
   ```

3. **Verify:**
   - All 13 questions render correctly
   - Text inputs accept text
   - Dropdowns show correct options
   - Radio buttons work with "Other" option
   - Auto-save works (check Network tab)
   - Submit button appears on last section
   - Completion screen shows after submission

## Customization

### Adding New Field Types

1. **Update DemographicsField component:**
   - Add new constant array for options
   - Add case in `getOptionsForField()`
   - Add special handling if needed (like text input, dropdown)

2. **Update Sanity schema:**
   - Add new option to `fieldType` field in [question.ts](../sanity/schemas/question.ts)

3. **Create new question in Sanity Studio:**
   - Set appropriate fieldType
   - Add to Demographics section

### Modifying Options

Edit the constant arrays in [DemographicsField.tsx:15-82](../src/components/survey/DemographicsField.tsx#L15-L82):

- `BANK_SIZES`
- `DEVICES`
- `EMPLOYMENT_STATUS`
- `GENDERS`
- `TIME_AT_BANK`
- `BANK_EXPERIENCE`
- `DIVISIONS`
- `JOB_ROLES`
- `COUNTRIES`
- `US_STATES`

## Related Files

- Survey Page: [src/app/(survey)/s/[token]/page.tsx](<../src/app/(survey)/s/[token]/page.tsx>)
- Survey Shell: [src/components/survey/SurveyShell.tsx](../src/components/survey/SurveyShell.tsx)
- Demographics Field Component: [src/components/survey/DemographicsField.tsx](../src/components/survey/DemographicsField.tsx)
- Response API: [src/app/api/responses/route.ts](../src/app/api/responses/route.ts)
- Prisma Schema: [prisma/schema.prisma](../prisma/schema.prisma)
- Sanity Question Schema: [sanity/schemas/question.ts](../sanity/schemas/question.ts)

## Troubleshooting

### Question Not Rendering

**Problem:** A demographics question isn't showing up in the survey.

**Solution:**

1. Verify question has `fieldType` set in Sanity
2. Check that section includes the question reference
3. Verify survey includes the section reference
4. Clear Next.js cache: `rm -rf .next`

### "Other" Option Not Working

**Problem:** Text input doesn't appear when selecting "Other".

**Solution:**

1. Ensure field type is `division` or `jobRole`
2. Check that options array includes `'Other'`
3. Verify `handleOtherChange` is being called

### Responses Not Saving to User Profile

**Problem:** User demographics aren't being saved to the users table.

**Solution:**

1. Check [route.ts:89-115](../src/app/api/responses/route.ts#L89-L115)
2. Verify question ID pattern matching
3. Ensure user is associated with invitation

## Future Enhancements

- [ ] Implement cascading location dropdowns (Country → State → Metro → City)
- [ ] Add Canadian provinces support
- [ ] Add international metro areas database
- [ ] Implement conditional logic (e.g., only show states if US is selected)
- [ ] Add validation for required fields
- [ ] Export demographics data with aggregated reports
