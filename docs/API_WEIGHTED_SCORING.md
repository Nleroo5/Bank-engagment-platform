# Weighted Scoring API Documentation

## Overview

The weighted scoring system provides endpoints for retrieving and exporting survey results with category-based weight multipliers. This system applies scoring weights to category totals based on the official scoring matrix.

## Authentication

All endpoints require authentication via NextAuth session. Users must have appropriate role permissions:

- `SUPER_ADMIN`: Access to all campaigns across all organizations
- `ORG_ADMIN`: Access to campaigns within their organization
- `VIEWER`: Read-only access to campaigns within their organization

## Endpoints

### 1. Get Campaign Report

Retrieves weighted scoring results for a specific campaign.

**Endpoint:** `GET /api/reports/[campaignId]`

**Authentication:** Required (Session-based)

**URL Parameters:**

- `campaignId` (string, required): UUID of the survey campaign

**Response Format:**

```typescript
{
  campaign: {
    id: string;
    surveyTitle: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    completedCount: number;
    totalInvitations: number;
    completionRate: number;
    organization: {
      id: string;
      name: string;
    };
  };
  survey: {
    id: string;
    title: string;
    surveyType: string;
    surveyNumber: string | null;
    scale: {
      min: number;
      max: number;
      labels: string[];
    };
  };
  categoryAggregates: Array<{
    categoryId: string;
    categoryName: string;
    categoryWeight: number;
    colorCode?: string;
    sortOrder?: number;
    averageWeightedScore: number;
    averageRawScore: number;
    minWeightedScore: number;
    maxWeightedScore: number;
    standardDeviation: number;
    averagePercentage: number;
    respondentCount: number;
    questionCount: number;
  }>;
  individualScores?: Array<{
    invitationId: string;
    userName: string;
    categoryScores: Array<{
      categoryId: string;
      categoryName: string;
      rawTotal: number;
      weightedScore: number;
      questionCount: number;
      answeredCount: number;
      maxPossibleWeighted: number;
      percentage: number;
    }>;
    overallMetrics: {
      totalWeightedScore: number;
      maxPossibleWeighted: number;
      completionRate: number;
      totalQuestionsAnswered: number;
      totalQuestions: number;
    };
  }>;
  anonymityStatus: {
    isAnonymous: boolean;
    meetsThreshold: boolean;
    requiredMinimum: number;
    actualCount: number;
  };
}
```

**Error Responses:**

- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User lacks permission to access campaign
- `404 Not Found`: Campaign or survey not found
- `500 Internal Server Error`: Server error occurred

**Example Request:**

```bash
curl -X GET \
  'https://yourdomain.com/api/reports/550e8400-e29b-41d4-a716-446655440000' \
  -H 'Cookie: next-auth.session-token=...'
```

**Example Response:**

```json
{
  "campaign": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "surveyTitle": "Q1 2024 Managerial Assessment",
    "status": "COMPLETED",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-31T23:59:59.999Z",
    "completedCount": 12,
    "totalInvitations": 15,
    "completionRate": 80.0,
    "organization": {
      "id": "org-123",
      "name": "First National Bank"
    }
  },
  "survey": {
    "id": "survey-managerial-assessment",
    "title": "Managerial Assessment",
    "surveyType": "likert3",
    "surveyNumber": "6",
    "scale": {
      "min": 1,
      "max": 3,
      "labels": ["Rarely", "Sometimes", "Frequently"]
    }
  },
  "categoryAggregates": [
    {
      "categoryId": "cat-communication",
      "categoryName": "Communication",
      "categoryWeight": 1.75,
      "colorCode": "#3B82F6",
      "sortOrder": 1,
      "averageWeightedScore": 18.2,
      "averageRawScore": 10.4,
      "minWeightedScore": 14.0,
      "maxWeightedScore": 21.0,
      "standardDeviation": 2.1,
      "averagePercentage": 86.7,
      "respondentCount": 12,
      "questionCount": 4
    }
  ],
  "individualScores": [
    {
      "invitationId": "inv-001",
      "userName": "John Doe",
      "categoryScores": [
        {
          "categoryId": "cat-communication",
          "categoryName": "Communication",
          "rawTotal": 11,
          "weightedScore": 19.3,
          "questionCount": 4,
          "answeredCount": 4,
          "maxPossibleWeighted": 21.0,
          "percentage": 91.9
        }
      ],
      "overallMetrics": {
        "totalWeightedScore": 152.5,
        "maxPossibleWeighted": 175.0,
        "completionRate": 100.0,
        "totalQuestionsAnswered": 35,
        "totalQuestions": 35
      }
    }
  ],
  "anonymityStatus": {
    "isAnonymous": false,
    "meetsThreshold": true,
    "requiredMinimum": 1,
    "actualCount": 12
  }
}
```

---

### 2. Export Campaign Report

Exports weighted scoring results in Excel or PDF format.

**Endpoint:** `GET /api/reports/[campaignId]/export`

**Authentication:** Required (Session-based)

**URL Parameters:**

- `campaignId` (string, required): UUID of the survey campaign

**Query Parameters:**

- `format` (string, optional): Export format - `xlsx` or `pdf` (default: `xlsx`)

**Response:**

- File download with appropriate MIME type
- Excel: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- PDF: `application/pdf`

**Excel Export Structure:**

The Excel file contains multiple sheets:

**Sheet 1: Summary**

- Survey title, organization name, survey type
- Date range and status
- Total invitations, completed responses, completion rate
- Overall weighted score average
- Scale range

**Sheet 2: Category Scores**

- Category name
- Weight multiplier (×)
- Average weighted score
- Average raw score
- Min/max weighted scores
- Standard deviation
- Percentage of maximum
- Question count
- Respondent count
- Legend explaining formulas

**Sheet 3: Individual Scores** (only for non-anonymous surveys)

- Respondent names
- Category scores (with weight multipliers in headers)
- Total weighted score
- Completion percentage

**PDF Export Structure:**

- Title: "Weighted Scoring Report"
- Survey information (title, organization, respondent count)
- Category weighted scores table
- Footer with page numbers and generation timestamp

**Error Responses:**

- `400 Bad Request`: Invalid format parameter
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`:
  - User lacks permission to access campaign
  - Insufficient respondents for anonymous survey (minimum 5 required)
- `404 Not Found`: Campaign or survey not found
- `500 Internal Server Error`: Server error occurred

**Example Requests:**

```bash
# Export as Excel (default)
curl -X GET \
  'https://yourdomain.com/api/reports/550e8400-e29b-41d4-a716-446655440000/export' \
  -H 'Cookie: next-auth.session-token=...' \
  --output report.xlsx

# Export as PDF
curl -X GET \
  'https://yourdomain.com/api/reports/550e8400-e29b-41d4-a716-446655440000/export?format=pdf' \
  -H 'Cookie: next-auth.session-token=...' \
  --output report.pdf
```

---

## Weighted Scoring Calculation

### Formula

For each category:

```
Raw Total = Sum of adjusted response values
Weighted Score = Raw Total × Category Weight
Percentage = (Weighted Score / Max Possible Weighted) × 100
```

### Reverse Scoring

Some questions are marked as `isReversed: true`. For these questions:

```
Adjusted Value = (Scale Max + 1) - Raw Value
```

For a 3-point scale:

- Raw 1 → Adjusted 3
- Raw 2 → Adjusted 2
- Raw 3 → Adjusted 1

### Category Weights

Based on the official scoring matrix:

| Category       | Weight | Questions | Max Raw | Max Weighted |
| -------------- | ------ | --------- | ------- | ------------ |
| Communication  | 1.75   | 4         | 12      | 21.0         |
| Leadership     | 1.0    | 7         | 21      | 21.0         |
| Culture        | 2.3    | 3         | 9       | 20.7         |
| Accountability | 1.7    | 6         | 18      | 30.6         |
| Execution      | 1.4    | 5         | 15      | 21.0         |
| Associate      | 1.4    | 5         | 15      | 21.0         |
| Team Dynamics  | 1.4    | 5         | 15      | 21.0         |

**Total:** 35 questions, Max Weighted Score: 156.3

### Aggregate Statistics

For campaign-level reports:

- **Average Weighted Score**: Mean of all respondents' weighted scores
- **Average Raw Score**: Mean of all respondents' raw totals (before weight)
- **Min/Max Weighted Score**: Range of weighted scores across respondents
- **Standard Deviation**: Spread of weighted scores
- **Average Percentage**: (Average Weighted / Max Possible Weighted) × 100

---

## Anonymity Rules

For **Associate 180 Assessment** (Survey 7):

1. **Minimum Threshold**: Requires 5 completed responses before generating reports
2. **Individual Scores**: Never exposed in API responses or exports
3. **Aggregate Only**: Only campaign-level statistics are available
4. **API Behavior**:
   - `individualScores` field is omitted from JSON response
   - "Individual Scores" sheet is omitted from Excel export
   - Export returns 403 error if threshold not met

**Error Response (Threshold Not Met):**

```json
{
  "error": "Insufficient respondents",
  "message": "This survey requires a minimum of 5 completed responses before exporting results."
}
```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Reports endpoint**: 100 requests per minute per user
- **Export endpoint**: 20 requests per minute per user

Rate limit headers included in responses:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Timestamp when limit resets

---

## Usage Examples

### React Component Example

```typescript
import { useState, useEffect } from 'react';
import type { WeightedCategoryScore } from '@/components/charts/CategoryScoresChart';

export function CampaignReport({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchReport() {
      try {
        const response = await fetch(`/api/reports/${campaignId}`);

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [campaignId]);

  if (loading) return <div>Loading report...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return null;

  return (
    <div>
      <h1>{data.campaign.surveyTitle}</h1>
      <p>Completion: {data.campaign.completionRate}%</p>

      {data.categoryAggregates.map((category: WeightedCategoryScore) => (
        <div key={category.categoryId}>
          <h3>{category.categoryName} (×{category.categoryWeight})</h3>
          <p>Weighted Score: {category.averageWeightedScore.toFixed(1)}</p>
          <p>Performance: {category.averagePercentage.toFixed(1)}%</p>
        </div>
      ))}
    </div>
  );
}
```

### Export Download Example

```typescript
export async function downloadReport(
  campaignId: string,
  format: 'xlsx' | 'pdf' = 'xlsx'
) {
  try {
    const response = await fetch(
      `/api/reports/${campaignId}/export?format=${format}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Export failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error('Download failed:', err);
    throw err;
  }
}
```

---

## Testing

### Unit Tests

Scoring engine tests are located at: `src/lib/scoring/categoryScoring.test.ts`

Run tests:

```bash
npm run test
```

### API Testing

Example test with `fetch`:

```typescript
describe('GET /api/reports/[campaignId]', () => {
  it('returns weighted scoring results', async () => {
    const response = await fetch(`/api/reports/${testCampaignId}`, {
      headers: {
        Cookie: `next-auth.session-token=${sessionToken}`,
      },
    });

    expect(response.status).toBe(200);

    const data = await response.json();

    expect(data).toHaveProperty('campaign');
    expect(data).toHaveProperty('categoryAggregates');
    expect(data.categoryAggregates[0]).toHaveProperty('categoryWeight');
    expect(data.categoryAggregates[0]).toHaveProperty('averageWeightedScore');
  });
});
```

---

## Troubleshooting

### Common Issues

**1. "Insufficient respondents" error**

- **Cause**: Anonymous survey has fewer than 5 completed responses
- **Solution**: Wait for more respondents to complete the survey

**2. Missing `individualScores` in response**

- **Cause**: Survey type is anonymous (Associate 180)
- **Solution**: Expected behavior - use `categoryAggregates` instead

**3. Weighted scores seem incorrect**

- **Cause**: May involve reverse-scored questions
- **Solution**: Check `isReversed` flag on questions - reverse scoring is applied automatically

**4. Export download fails**

- **Cause**: Session expired or insufficient permissions
- **Solution**: Re-authenticate and verify user role

**5. Category weights don't match expectations**

- **Cause**: Weights may not be set correctly in Sanity
- **Solution**: Run `npm run populate-category-weights` to update Sanity

---

## Migration Guide

### From Old Scoring System

If upgrading from the previous scoring system:

1. **Database**: Run migration to add `adjustedValue` column

   ```sql
   ALTER TABLE "responses" ADD COLUMN "adjusted_value" INTEGER;
   COMMENT ON COLUMN "responses"."adjusted_value" IS 'Value after reverse-scoring applied';
   ```

2. **Backfill**: Run backfill script for existing responses

   ```bash
   npx tsx scripts/backfill-adjusted-values.ts
   ```

3. **Sanity**: Update category weights

   ```bash
   npx tsx scripts/populate-category-weights.ts
   ```

4. **Code**: Update imports

   ```typescript
   // OLD
   import { calculateScores } from '@/lib/scoring/calculate';

   // NEW
   import { calculateCategoryScores } from '@/lib/scoring/categoryScoring';
   ```

---

## Support

For questions or issues with the weighted scoring system:

1. Check the [SCORING_MATRIX_REFERENCE.md](./SCORING_MATRIX_REFERENCE.md) for official category mappings
2. Review unit tests in `src/lib/scoring/categoryScoring.test.ts`
3. Verify Sanity configuration with `npm run verify-question-mappings`
4. Check logs in development mode for detailed error information

---

## Changelog

### Version 2.0.0 (Current)

- Implemented weighted category scoring system
- Added reverse-scoring support
- Created comprehensive scoring engine with 24 unit tests
- Updated API endpoints to return weighted scores
- Enhanced Excel/PDF exports with weighted metrics
- Added anonymity threshold enforcement

### Version 1.0.0 (Previous)

- Basic scoring without category weights
- Simple aggregate calculations
- No reverse-scoring support
