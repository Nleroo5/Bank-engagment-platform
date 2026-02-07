# Reporting Dashboard Documentation ✅

## Overview
Built a comprehensive reporting dashboard with interactive charts, demographic filters, and anonymity protection for Survey 7 (Associate 180).

## Created Files

### Pages
1. **[src/app/(admin)/admin/reports/page.tsx](src/app/(admin)/admin/reports/page.tsx)** - Reports list showing completed campaigns
2. **[src/app/(admin)/admin/reports/[campaignId]/page.tsx](src/app/(admin)/admin/reports/[campaignId]/page.tsx)** - Detailed report view page

### API Routes
3. **[src/app/api/reports/[campaignId]/route.ts](src/app/api/reports/[campaignId]/route.ts)** - GET endpoint for report data with filters

### Components
4. **[src/components/reports/ReportView.tsx](src/components/reports/ReportView.tsx)** - Main client component for report display
5. **[src/components/reports/DemographicFilters.tsx](src/components/reports/DemographicFilters.tsx)** - Filter panel with anonymity protection
6. **[src/components/charts/CategoryBarChart.tsx](src/components/charts/CategoryBarChart.tsx)** - Bar chart for category scores
7. **[src/components/charts/CategoryRadarChart.tsx](src/components/charts/CategoryRadarChart.tsx)** - Radar/spider chart for category comparison

## Features Implemented

### 1. Reports List Page (`/admin/reports`)

**Features:**
- ✅ Shows campaigns with COMPLETED or ACTIVE status
- ✅ Role-based filtering (ORG_ADMIN sees only their org)
- ✅ Grid layout with campaign cards
- ✅ Each card displays:
  - Survey title and organization
  - Status badge (COMPLETED/ACTIVE)
  - Response count and rate
  - End date
- ✅ Empty state with link to campaigns
- ✅ Click to view detailed report

### 2. Detailed Report View (`/admin/reports/[campaignId]`)

**Header:**
- ✅ Campaign title
- ✅ Organization name
- ✅ Date range (start - end)
- ✅ Status badge
- ✅ Back button to reports list

**Summary Cards:**
- ✅ **Respondents**: Shows filtered count (updates with filters)
- ✅ **Response Rate**: Percentage with completed/total counts
- ✅ **Overall Score**: Large display with visual bar

**Visualizations:**
- ✅ **Overall Score Display**: Large number with progress bar
- ✅ **Category Bar Chart**: 7 categories with color-coded bars
  - Each category uses a distinct color
  - Bars show average score out of scale max
  - X-axis rotated 45° for readability
  - Y-axis shows 0 to scale max
- ✅ **Sections Table**: Tabular view with:
  - Section name
  - Number of items
  - Average score (with progress bar)
- ✅ **Category Radar Chart**: Spider chart for visual comparison
  - All 7 categories on polar axes
  - Blue fill with transparency

**Demographic Filters (Sidebar):**
- ✅ Division filter
- ✅ Job Role filter
- ✅ Time at Bank filter
- ✅ Gender filter
- ✅ Each filter shows respondent count: "Technology (12)"
- ✅ Filters disabled if < 5 respondents (anonymity protection)
- ✅ Clear all button
- ✅ Active filter count display
- ✅ Real-time updates when filters change

### 3. API Route (`GET /api/reports/[campaignId]`)

**Query Parameters:**
- `?division=Technology`
- `?jobRole=IT Specialist`
- `?timeAtBank=1-3 years`
- `?bankExperience=5-10 years`

**Response Structure:**
```json
{
  "campaign": {
    "id": "uuid",
    "surveyTitle": "Leadership Team Effectiveness",
    "surveyType": "likert5",
    "organizationName": "Example Bank",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "status": "COMPLETED"
  },
  "metrics": {
    "totalInvitations": 50,
    "completedCount": 42,
    "completionRate": 84.0,
    "filteredCount": 12
  },
  "scores": {
    "overall": 4.2,
    "categories": [
      {
        "categoryId": "cat1",
        "categoryName": "Communication",
        "averageScore": 4.5,
        "questionCount": 8,
        "responseCount": 96
      }
    ],
    "sections": [
      {
        "sectionId": "sec1",
        "sectionTitle": "Goal Setting",
        "averageScore": 4.3,
        "questionCount": 10,
        "responseCount": 120
      }
    ]
  },
  "filters": {
    "applied": {
      "division": "Technology"
    },
    "available": {
      "divisions": [
        { "field": "division", "label": "Division: Technology", "value": "Technology", "count": 12 },
        { "field": "division", "label": "Division: Operations", "value": "Operations", "count": 8 }
      ],
      "jobRoles": [...],
      "genders": [...],
      "timeAtBank": [...]
    }
  }
}
```

**Features:**
- ✅ Role-based access control (ORG_ADMIN restricted to their org)
- ✅ Anonymity threshold check (min 5 respondents for Survey 7)
- ✅ Filter validation (ensures filtered pool >= 5 for anonymous surveys)
- ✅ Dynamic score calculation based on applied filters
- ✅ Returns available filter options (only those with >= 5 respondents)
- ✅ Handles reverse scoring automatically
- ✅ Rounds all scores to 1 decimal place

**Error Responses:**

**403 - Insufficient Respondents:**
```json
{
  "error": "Insufficient respondents",
  "message": "This survey requires a minimum of 5 completed responses before viewing results to protect respondent anonymity.",
  "requiresAnonymity": true,
  "threshold": 5
}
```

**400 - Filter Too Restrictive:**
```json
{
  "error": "Filter results in too few respondents",
  "message": "Only 3 respondents match these filters. Minimum 5 required for anonymity protection.",
  "count": 3
}
```

## Chart Features

### Category Bar Chart
- **Library**: Recharts `<BarChart>`
- **Features**:
  - Responsive container (100% width, 400px height)
  - Colored bars by category (7 distinct colors)
  - Rounded bar tops for polish
  - Grid background
  - X-axis: Category names (rotated -45°)
  - Y-axis: Score from 0 to scale max
  - Tooltip shows value to 1 decimal
  - Legend included

**Category Colors:**
```typescript
Communication: #3b82f6  (blue)
Leadership: #8b5cf6     (purple)
Culture: #ec4899        (pink)
Accountability: #f59e0b (amber)
Execution: #10b981      (green)
Associate: #06b6d4      (cyan)
Team Dynamics: #ef4444  (red)
```

### Category Radar Chart
- **Library**: Recharts `<RadarChart>`
- **Features**:
  - Responsive container (100% width, 400px height)
  - All 7 categories on polar axes
  - Blue fill with 60% opacity (#3b82f6)
  - Polar grid and radius axis
  - Tooltip shows value to 1 decimal
  - Scales from 0 to scale max

## Anonymity Protection

### Survey 7 (Associate 180) Rules
1. **Minimum 5 Respondents**: Report access denied if < 5 completed responses
2. **Filter Restrictions**: Only show filters where count >= 5
3. **Combined Filters**: Validate that applying multiple filters maintains threshold
4. **Error Messages**: Clear messaging when threshold not met

### Implementation
```typescript
// Check threshold before showing report
const meetsThreshold = await checkAnonymityThreshold(
  campaign.id,
  survey.surveyType
);

if (!meetsThreshold) {
  return 403 error with anonymity message
}

// Get safe filter options (only >= 5 respondents)
const filterOptions = await getFilterableOptions(
  campaign.id,
  survey.surveyType
);

// Validate applied filters
if (filters applied) {
  const validation = await validateFilteredAnonymity(
    campaign.id,
    survey.surveyType,
    filters
  );

  if (!validation.valid) {
    return 400 error with count
  }
}
```

## Real-Time Filtering

The report recalculates scores dynamically when filters are applied:

1. User selects "Division: Technology"
2. `DemographicFilters` calls `onFilterChange({ division: 'Technology' })`
3. `ReportView` updates state and triggers `fetchReportData()`
4. API fetches only invitations where `user.division === 'Technology'`
5. Scores recalculated from filtered responses
6. Charts and tables update with new data
7. "Respondents" card shows filtered count

## Responsive Design

All components are fully responsive:

- **Grid Layout**: `md:grid-cols-2 lg:grid-cols-3` for list
- **Report Layout**: `lg:grid-cols-4` with 3-column content, 1-column sidebar
- **Charts**: `ResponsiveContainer` automatically adjusts to parent width
- **Tables**: `overflow-x-auto` for horizontal scrolling on mobile
- **Sticky Sidebar**: `sticky top-6` keeps filters visible while scrolling

## Scale Detection

The system automatically detects the scale based on survey type:

```typescript
const scaleMax = data.campaign.surveyType === 'likert3' ? 3 : 5;
```

- **likert3**: 1-3 scale (Managerial Assessment, Associate 180)
- **likert5**: 1-5 scale (LTE, OTE)
- **demographics**: Not scored

## Loading States

- **Initial Load**: Spinner with "Loading report..." message
- **Filter Changes**: Spinner appears during recalculation
- **Error States**: Red alert box with error message and details

## Build Status

```bash
✓ Compiled successfully
✓ All 23 routes built
✓ New routes: /admin/reports, /admin/reports/[campaignId], /api/reports/[campaignId]

Route (app)                              Size     First Load JS
├ ƒ /admin/reports                       182 B          96.4 kB
├ ƒ /admin/reports/[campaignId]          107 kB          203 kB
├ ƒ /api/reports/[campaignId]            0 B                0 B
```

**Note**: The [campaignId] page is 107 kB due to Recharts bundle. This is expected for data visualization.

## Testing the Reports

### Prerequisites
1. At least one ACTIVE or COMPLETED campaign
2. At least 5 completed responses (for Survey 7)
3. Users with demographic data (division, jobRole, etc.)

### Test Flow
1. Navigate to `/admin/reports`
2. Click on a campaign card
3. View the overall score and charts
4. Apply a filter (e.g., Division: Technology)
5. Watch scores recalculate in real-time
6. Try multiple filters
7. Clear all filters

### Expected Behavior
- Scores update immediately when filters change
- Filters with < 5 respondents are disabled
- Error shown if filtered pool drops below 5 (Survey 7 only)
- Charts animate smoothly
- All scores rounded to 1 decimal place

## Future Enhancements

### Export Features
- **Export to Excel**: Download full report with all scores
- **Export to PDF**: Generate printable report with charts
- **Email Report**: Send report link or PDF to stakeholders

### Advanced Filtering
- **Date Range**: Filter responses by submission date
- **Multiple Select**: Allow selecting multiple divisions at once
- **Custom Groups**: Create saved filter combinations

### Comparative Views
- **Trend Analysis**: Compare scores across multiple campaigns
- **Benchmark**: Compare organization scores to industry benchmarks
- **Historical**: Show score changes over time

### Additional Charts
- **Line Chart**: Score trends over time
- **Heatmap**: Category x Section score matrix
- **Distribution**: Show score distribution (how many 1s, 2s, etc.)

---

**Reporting dashboard is production-ready!** 🎉

Admins can now view comprehensive analytics for completed campaigns, with interactive charts, demographic filtering, and full anonymity protection for sensitive surveys.
