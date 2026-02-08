# Leadership Team Effectiveness (LTE) Survey - Implementation Guide

## Overview

The Leadership Team Effectiveness (LTE) survey is Survey #4 in the Bank Engagement Platform. It assesses how well leadership teams work together across four key dimensions.

## Survey Structure

**Survey ID:** `leadership-team-effectiveness`
**Survey Number:** 4
**Survey Type:** `likert5` (5-point agreement scale)
**Estimated Time:** 15 minutes
**Total Questions:** 40
**Sections:** 4

## Survey Sections

### Section 1: Goal Setting (Questions 1-10)
**Focus:** How effectively the team sets and pursues goals

**Categories Covered:**
- Communication (Q1, Q7)
- Leadership (Q2, Q8)
- Execution (Q3, Q9)
- Team Dynamics (Q4)
- Accountability (Q5)
- Culture (Q6)
- Associate (Q10)

### Section 2: Roles within the Team (Questions 11-20)
**Focus:** Role clarity, accountability, and effectiveness

**Categories Covered:**
- Team Dynamics (Q11, Q18)
- Accountability (Q12, Q19)
- Leadership (Q13, Q20)
- Communication (Q14)
- Culture (Q15)
- Execution (Q16)
- Associate (Q17)

### Section 3: Interpersonal Relationships (Questions 21-30)
**Focus:** Trust, collaboration, and team dynamics

**Categories Covered:**
- Communication (Q21, Q28)
- Culture (Q22, Q29)
- Team Dynamics (Q23, Q30)
- Leadership (Q24)
- Accountability (Q25)
- Execution (Q26)
- Associate (Q27)

### Section 4: Procedures (Questions 31-40)
**Focus:** Processes, decision-making, and coordination

**Categories Covered:**
- Accountability (Q31, Q38)
- Leadership (Q32, Q39)
- Execution (Q33, Q40)
- Communication (Q34)
- Culture (Q35)
- Associate (Q36)
- Team Dynamics (Q37)

## Rating Scale

**5-Point Likert Scale:**
1. **Strongly Disagree** - Statement does not describe the team at all
2. **Disagree** - Statement rarely describes the team
3. **Neutral** - Statement sometimes describes the team
4. **Agree** - Statement often describes the team
5. **Strongly Agree** - Statement always describes the team

## Category Distribution

All 40 questions are mapped to 7 categories for scoring and analysis:

- **Communication** - 8 questions (Q1, Q7, Q14, Q21, Q28, Q34)
- **Leadership** - 8 questions (Q2, Q8, Q13, Q20, Q24, Q32, Q39)
- **Culture** - 5 questions (Q6, Q15, Q22, Q29, Q35)
- **Accountability** - 6 questions (Q5, Q12, Q19, Q25, Q31, Q38)
- **Execution** - 6 questions (Q3, Q9, Q16, Q26, Q33, Q40)
- **Associate** - 4 questions (Q10, Q17, Q27, Q36)
- **Team Dynamics** - 7 questions (Q4, Q11, Q18, Q23, Q30, Q37)

## Sample Questions

### With Anchor Text
Questions include optional anchor text that provides context about the ideal state:

**Question 2:**
- **Statement:** "Leaders ensure that team objectives align with organizational priorities"
- **Anchor Text:** "Objectives are always thoroughly discussed with others on the team"

**Question 11:**
- **Statement:** "Each team member understands their role and responsibilities"
- **Anchor Text:** "Roles are clearly defined and communicated"

### Category Examples

**Communication (Blue):**
- Q1: Team goals are clearly defined and communicated to all members
- Q14: Team members communicate about role-related issues
- Q28: Communication is open and honest

**Leadership (Purple):**
- Q2: Leaders ensure that team objectives align with organizational priorities
- Q13: Leadership roles are appropriate and effective
- Q32: Procedures are regularly reviewed and improved

**Culture (Green):**
- Q6: The team celebrates achievements and learns from setbacks
- Q15: The team has a culture of mutual support
- Q35: Meetings are productive and well-organized

## Technical Implementation

### Components Used

**Survey Rendering:**
- [SurveyShell.tsx](../src/components/survey/SurveyShell.tsx) - Main survey container
- [LikertScale5.tsx](../src/components/survey/LikertScale5.tsx) - 5-point rating component
- [SectionHeader.tsx](../src/components/survey/SectionHeader.tsx) - Section display
- [SurveyProgress.tsx](../src/components/survey/SurveyProgress.tsx) - Progress indicator

### Data Storage

**Responses Table:**
```typescript
{
  invitationId: string;
  sanityQuestionId: string;
  questionNumber: number;
  value: number;           // 1-5 for Likert responses
  adjustedValue: number;   // Same as value (no reverse scoring in LTE)
  textValue: null;         // Not used for Likert surveys
  submittedAt: DateTime;
}
```

### Scoring

LTE uses **weighted category scoring**:
- Each category has a weight multiplier (defined in Sanity)
- Raw scores are calculated by summing response values per category
- Weighted scores = raw score × category weight
- Final scores are normalized to percentages for comparison

See [WEIGHTED_SCORING_IMPLEMENTATION.md](./WEIGHTED_SCORING_IMPLEMENTATION.md) for details.

## Creating an LTE Campaign

### Step 1: Admin Dashboard Setup

1. Navigate to `/admin/campaigns`
2. Click "Create New Campaign"
3. **Select Survey:** "Leadership Team Effectiveness (LTE)"
4. **Set Details:**
   - Campaign Name (e.g., "Q1 2024 Leadership Assessment")
   - Organization
   - Start Date
   - End Date
   - Reminder interval

### Step 2: Add Respondents

1. Upload CSV or manually add respondents
2. Each respondent receives a unique tokenized URL
3. Emails are sent automatically with survey links

### Step 3: Launch Campaign

1. Set status to "ACTIVE"
2. Invitations are sent via email
3. Track progress in campaign dashboard

## Respondent Experience

1. **Email Receipt:** Receives invitation with personalized link
2. **Welcome Screen:** Survey introduction and estimated time
3. **Section 1 - Goal Setting:** 10 questions with 5-point scale
4. **Section 2 - Roles:** 10 questions with 5-point scale
5. **Section 3 - Relationships:** 10 questions with 5-point scale
6. **Section 4 - Procedures:** 10 questions with 5-point scale
7. **Auto-save:** Responses saved automatically as answered
8. **Submit:** Final submission and thank you screen

## Viewing Results

### Individual Reports
- View completed responses per invitation
- See all 40 answers with category breakdowns
- Export to PDF or Excel

### Aggregate Reports
- Category score averages across all respondents
- Weighted scores by category
- Comparison charts and trends
- Filter by demographics (division, role, etc.)

## Customization

### Updating Questions

1. Open Sanity Studio: `npm run sanity:dev`
2. Navigate to Content → Questions
3. Find question by number (1-40)
4. Edit text or anchor text
5. Publish changes

### Modifying Categories

Category mappings are defined in the creation script. To change:

1. Update category weights in Sanity Studio
2. Run weight population script:
   ```bash
   npx tsx scripts/populate-category-weights.ts
   ```

### Adding/Removing Questions

**Not Recommended:** The LTE survey is standardized at 40 questions. Changing the structure may affect:
- Score calculations
- Historical comparisons
- Benchmark data

If modifications are necessary, update:
1. Creation script question definitions
2. Category mappings
3. Section question ranges

## Testing

### Manual Testing

```bash
# 1. Create test campaign
# 2. Generate invitation
# 3. Access survey at /s/[TOKEN]
# 4. Complete all 40 questions
# 5. Verify in database:
psql $DATABASE_URL -c "SELECT * FROM responses WHERE invitation_id = '[ID]';"
```

### Automated Testing

```bash
npm run test -- LikertScale5.test.ts
npm run test:e2e -- lte-survey.spec.ts
```

## API Endpoints

### Save Response (PATCH)
```typescript
PATCH /api/responses
Body: {
  token: string,
  questionId: string,
  value: number  // 1-5
}
Response: {
  success: boolean,
  response: Response
}
```

### Submit Survey (POST)
```typescript
POST /api/responses/submit
Body: {
  token: string
}
Response: {
  success: boolean,
  message: string
}
```

### Get Report (GET)
```typescript
GET /api/reports/[campaignId]
Response: {
  campaign: Campaign,
  categoryScores: WeightedCategoryScore[],
  respondentCount: number,
  completionRate: number
}
```

## Related Files

**Scripts:**
- [create-lte-survey.ts](../scripts/create-lte-survey.ts) - Survey creation
- [verify-question-mappings.ts](../scripts/verify-question-mappings.ts) - Validate categories

**Components:**
- [SurveyShell.tsx](../src/components/survey/SurveyShell.tsx) - Main container
- [LikertScale5.tsx](../src/components/survey/LikertScale5.tsx) - 5-point scale widget

**Scoring:**
- [categoryScoring.ts](../src/lib/scoring/categoryScoring.ts) - Score calculation engine
- [CategoryScoresChart.tsx](../src/components/charts/CategoryScoresChart.tsx) - Visualization

**API:**
- [responses/route.ts](../src/app/api/responses/route.ts) - Save responses
- [responses/submit/route.ts](../src/app/api/responses/submit/route.ts) - Final submission

## Troubleshooting

### Questions Not Rendering

**Problem:** Survey loads but questions don't appear.

**Solution:**
1. Check Sanity Studio for question documents
2. Verify section → question references
3. Clear Next.js cache: `rm -rf .next && npm run dev`

### Anchor Text Not Showing

**Problem:** Anchor text is missing on some questions.

**Solution:**
1. In Sanity Studio, edit the question
2. Add text to "Anchor Text (Right Side)" field
3. Save and republish

### Wrong Category Colors

**Problem:** Category colors don't match expected scheme.

**Solution:**
1. Update category color codes in Sanity
2. Color hex codes are defined in `CategoryScoresChart.tsx`
3. Ensure consistency between Sanity and component

### Score Calculation Issues

**Problem:** Category scores seem incorrect.

**Solution:**
1. Verify all questions have category references
2. Check category weights in Sanity
3. Run verification: `npx tsx scripts/verify-question-mappings.ts`
4. Review scoring logic in `categoryScoring.ts`

## Best Practices

### Survey Administration

- **Frequency:** Administer quarterly or bi-annually
- **Anonymity:** Consider anonymous responses for honest feedback
- **Communication:** Explain purpose and how results will be used
- **Follow-up:** Share results and action plans with participants

### Data Analysis

- **Benchmark:** Compare results over time
- **Segment:** Analyze by division, seniority, tenure
- **Focus:** Identify lowest-scoring categories for improvement
- **Correlate:** Link LTE scores with business outcomes

### Continuous Improvement

- **Action Planning:** Create improvement plans for weak areas
- **Track Progress:** Re-survey after interventions
- **Celebrate Wins:** Recognize improvements in scores
- **Iterate:** Refine questions based on feedback

## Future Enhancements

- [ ] Add conditional logic (skip questions based on responses)
- [ ] Implement team comparison reports
- [ ] Add benchmarking against industry standards
- [ ] Create interactive dashboard with drill-down capabilities
- [ ] Add comment fields for qualitative feedback
- [ ] Implement real-time results during active campaigns

## Additional Resources

- [Scoring Matrix Reference](./SCORING_MATRIX_REFERENCE.md)
- [Weighted Scoring Implementation](./WEIGHTED_SCORING_IMPLEMENTATION.md)
- [API Documentation](./API_WEIGHTED_SCORING.md)
- [Admin User Guide](./ADMIN_GUIDE.md) _(coming soon)_
