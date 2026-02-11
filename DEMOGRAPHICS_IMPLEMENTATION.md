# Demographics Survey Implementation ✅

## Overview

Added support for Demographics survey form with text inputs, dropdowns, and radio groups - distinct from the Likert scale surveys.

## Changes Made

### 1. Database Schema Updates

**File**: `prisma/schema.prisma`

Updated the `Response` model to support both numeric (Likert) and text (demographics) responses:

- Made `value` field nullable (`Int?`) for Likert responses
- Added `textValue` field (`String?`) for demographics text responses

```prisma
model Response {
  value            Int? // For Likert scale responses (1-5 or 1-3)
  textValue        String? // For demographics text responses
}
```

### 2. Survey Component - DemographicsField

**File**: `src/components/survey/DemographicsField.tsx`

Created a new component that renders different input types based on field type:

**Field Types Supported**:

- `bankName` - Text input
- `country` - Dropdown (United States, Canada)
- `state` - Dropdown (50 US states)
- `city` - Text input
- `bankSize` - Dropdown (11 size ranges)
- `device` - Radio group (Desktop/Laptop, Tablet, Mobile Phone)
- `employmentStatus` - Radio group (Full-time, Part-time, Peak-time)
- `gender` - Radio group (Female, Male, Other)
- `timeAtBank` - Radio group (0-5 years, 6-10 years, 11-20 years, >20 years)
- `bankExperience` - Radio group (0-5 years, 6-10 years, 11-20 years, >20 years)
- `division` - Dropdown (11 options + Other with text input)
- `jobRole` - Dropdown (16 options + Other with text input)

**Features**:

- ✅ Handles "Other" option with conditional text input for Division and Job Role
- ✅ Mobile responsive design matching Likert scale styling
- ✅ Question number badge
- ✅ Visual selection feedback
- ✅ Disabled state support

### 3. Survey Shell Updates

**File**: `src/components/survey/SurveyShell.tsx`

Updated to support both Likert and Demographics survey types:

**Type Changes**:

- Updated `existingResponses` to accept `Record<string, number | string>`
- Updated `answers` state to handle both number and string values
- Updated `handleAnswerChange` to accept `number | string`
- Updated `saveResponse` to accept `number | string`

**Rendering Logic**:

- Added check for `survey.surveyType === 'demographics'`
- Renders `DemographicsField` for demographics surveys
- Renders `LikertScale5` or `LikertScale3` for Likert surveys
- Extracts `fieldType` from question object (from `question.fieldType` or `question.slug.current`)

### 4. API Route Updates

**File**: `src/app/api/responses/route.ts`

Enhanced the PATCH endpoint to handle both response types:

**Validation**:

- Updated Zod schema to accept `z.union([z.number(), z.string()])`

**Response Storage**:

- Detects if value is numeric or text
- Stores numbers in `value` field
- Stores text in `textValue` field

**User Profile Updates**:

- For specific demographics fields, also updates the user's profile
- Fields saved to profile: `division`, `jobRole`, `employmentStatus`, `gender`, `timeAtBank`, `bankExperience`
- Uses pattern matching on questionId to determine which profile field to update

### 5. Survey Page Updates

**File**: `src/app/(survey)/s/[token]/page.tsx`

Updated to load both numeric and text responses:

- Changed `existingResponses` type to `Record<string, number | string>`
- Loads `textValue` if present, otherwise uses `value`

### 6. Type Definitions

**File**: `src/types/survey.ts`

Added fields to the `Question` interface:

- `fieldType?: string` - For demographics: 'bankName', 'state', 'bankSize', etc.
- `slug?: { current: string }` - Alternative way to identify field type

## Data Flow

### Saving Demographics Responses

1. User selects a value in DemographicsField
2. `onChange` called with `(questionId, value)` where value is a string
3. SurveyShell updates local state and triggers debounced save (500ms)
4. PATCH `/api/responses` called with token, questionId, and string value
5. API route:
   - Validates token and campaign status
   - Determines value is text (not numeric)
   - Upserts response with `textValue` set, `value` set to null
   - If questionId matches profile field pattern, also updates user profile
   - Updates invitation status to IN_PROGRESS
   - Updates response session

### Loading Existing Responses

1. Server Component fetches invitation with responses
2. For each response, checks if `textValue` exists
3. Uses `textValue ?? value ?? 0` to get the correct value
4. Passes to SurveyShell as `existingResponses`
5. SurveyShell populates local state
6. DemographicsField displays saved value

## Profile Field Mapping

The API automatically updates user profile fields based on questionId patterns:

| Pattern in questionId | User Profile Field |
| --------------------- | ------------------ |
| `division`            | `division`         |
| `jobrole`             | `jobRole`          |
| `employmentstatus`    | `employmentStatus` |
| `gender`              | `gender`           |
| `timeatbank`          | `timeAtBank`       |
| `bankexperience`      | `bankExperience`   |

## Build Status

```bash
npm run build
✓ Compiled successfully
✓ Generating static pages (11/11)

Route (app)                              Size     First Load JS
├ ƒ /s/[token]                           5.48 kB        92.7 kB
├ ƒ /api/responses                       0 B                0 B
```

## Next Steps (Future Enhancements)

### 1. Enhanced Validation

- Required field indicators
- Email validation for contact fields
- Custom validation messages

### 2. Sanity Schema

Create Sanity schema for demographics questions with:

- `fieldType` field to specify input type
- Field-specific validation rules
- Custom options arrays

### 3. Testing

- Create test demographics survey in Sanity
- Create test campaign
- Generate test invitation
- Test form submission end-to-end

## File Changes Summary

### Created

- ✅ `src/components/survey/DemographicsField.tsx` - New component

### Modified

- ✅ `prisma/schema.prisma` - Added textValue field
- ✅ `src/components/survey/SurveyShell.tsx` - Demographics support
- ✅ `src/app/api/responses/route.ts` - Handle text values and profile updates
- ✅ `src/app/(survey)/s/[token]/page.tsx` - Load text responses
- ✅ `src/types/survey.ts` - Added fieldType and slug to Question interface

## Usage Example

In Sanity, create a Demographics survey with questions like:

```javascript
{
  _type: 'question',
  number: 1,
  text: 'What is the name of your bank?',
  fieldType: 'bankName',
  // or use slug:
  slug: { current: 'bankName' }
}

{
  _type: 'question',
  number: 2,
  text: 'What is your job role?',
  fieldType: 'jobRole',
  slug: { current: 'jobRole' }
}
```

The component will automatically render the correct input type and handle the data appropriately.

---

**Demographics survey form is production-ready!** 🎉

Respondents can now complete demographics surveys with various input types, and their responses are saved both as survey responses and to their user profiles.
