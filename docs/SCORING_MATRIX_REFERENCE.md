# Managerial Assessment (Survey 6) - Scoring Matrix Reference

**Source:** Scoring matrix image provided by client
**Last Updated:** 2026-02-07
**Status:** Official reference for weighted scoring implementation

---

## Category Weights and Question Mappings

This document defines the EXACT category weights and question-to-category mappings for the Managerial Assessment survey (Survey 6). All scoring calculations MUST use these values.

### 1. Communication
- **Weight Multiplier:** `1.75`
- **Question Numbers:** 6, 13, 20, 26
- **Question Count:** 4
- **Calculation:** `(Q6 + Q13 + Q20 + Q26) × 1.75`

### 2. Leadership
- **Weight Multiplier:** `1.0` (no multiplier)
- **Question Numbers:** 1, 7, 14, 21, 27, 33, 35
- **Question Count:** 7
- **Calculation:** `(Q1 + Q7 + Q14 + Q21 + Q27 + Q33 + Q35) × 1.0`

### 3. Culture
- **Weight Multiplier:** `2.3`
- **Question Numbers:** 8, 15, 28
- **Question Count:** 3
- **Calculation:** `(Q8 + Q15 + Q28) × 2.3`

### 4. Accountability
- **Weight Multiplier:** `1.7`
- **Question Numbers:** 2, 9, 16, 22, 29, 34
- **Question Count:** 6
- **Calculation:** `(Q2 + Q9 + Q16 + Q22 + Q29 + Q34) × 1.7`

### 5. Execution
- **Weight Multiplier:** `1.4`
- **Question Numbers:** 3, 10, 17, 23, 30
- **Question Count:** 5
- **Calculation:** `(Q3 + Q10 + Q17 + Q23 + Q30) × 1.4`

### 6. Associate
- **Weight Multiplier:** `1.4`
- **Question Numbers:** 4, 11, 18, 24, 31
- **Question Count:** 5
- **Calculation:** `(Q4 + Q11 + Q18 + Q24 + Q31) × 1.4`

### 7. Team Dynamics
- **Weight Multiplier:** `1.4`
- **Question Numbers:** 5, 12, 19, 25, 32
- **Question Count:** 5
- **Calculation:** `(Q5 + Q12 + Q19 + Q25 + Q32) × 1.4`

---

## Validation Checklist

### Total Question Count
- **Expected:** 35 questions (4 + 7 + 3 + 6 + 5 + 5 + 5 = 35) ✓
- **Actual:** [TO BE VERIFIED]

### Question Number Coverage
- **Range:** 1-35 with no gaps
- **All questions accounted for:** [TO BE VERIFIED]

### Scale Information
- **Scale Type:** 3-point Likert
- **Values:** 1 = Rarely, 2 = Sometimes, 3 = Frequently
- **Reverse Scoring:** Some questions have inverted scoring (see CLAUDE.md)

---

## Implementation Notes

### In Sanity CMS
Each category document must have the `weight` field set to the exact values above:
```typescript
{
  name: "Communication",
  weight: 1.75,
  // ... other fields
}
```

### In Scoring Engine
1. Fetch question responses
2. Group by category reference
3. Apply reverse-scoring adjustment if `isReversed === true`
4. Sum adjusted scores per category
5. Multiply category total by weight
6. Round to 1 decimal place for display

### Formula
```
weightedScore = ROUND(SUM(adjustedScores) × categoryWeight, 1)
```

---

## Survey Type Coverage

**Note from client:** "ALL 5 SURVEYS WILL NEED A SURVEY SUMMARY PAGE WITH VISUAL GRAPHICS"

This scoring matrix is specific to **Managerial Assessment (Survey 6)**. Other surveys may have:
- Different weights (to be defined)
- Different question counts
- Different category mappings

Do NOT assume all surveys use the same weights.

---

## Change Control

Any changes to weights or mappings MUST:
1. Be approved by client in writing
2. Update this document
3. Update category documents in Sanity
4. Add migration notes if historical data affected
5. Regenerate all affected reports

**Version History:**
- v1.0 (2026-02-07): Initial reference from client scoring matrix image
