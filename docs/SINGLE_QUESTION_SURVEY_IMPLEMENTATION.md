# Single-Question Auto-Advance Survey Implementation

## Overview

This document describes the implementation of the single-question auto-advance survey user experience for both tracked and anonymous surveys.

## Problem Addressed

The previous survey UI showed all questions in a section at once, which was overwhelming and didn't match the desired user experience. The new implementation shows **one question at a time** and automatically advances to the next question after the user selects an answer.

## Implementation

### Components Created

#### 1. SingleQuestionSurveyShell
**Location:** `src/components/survey/SingleQuestionSurveyShell.tsx`

Used for tracked surveys (accessed via invitation token at `/s/[token]`).

**Features:**
- Shows one question at a time
- Auto-advances after answer selection (800ms delay)
- Debounced auto-save (500ms) to server
- LocalStorage persistence for resume capability
- Smooth Framer Motion transitions
- Back navigation with keyboard support (← arrow key)
- Progress bar showing question X of Y
- Visual feedback: "Saving..." and "Answer recorded" indicators
- Welcome screen before survey starts
- Completion screen after submission

**Key Technical Decisions:**
- 800ms auto-advance delay (research-backed to prevent accidental clicks)
- 500ms save debounce (balances server load with data safety)
- Separate timeout refs for save and advance (can be cancelled independently)
- Optimistic UI updates (local state updates immediately)
- Framer Motion `AnimatePresence` with `mode="wait"` for smooth transitions

#### 2. SingleQuestionAnonymousSurveyShell
**Location:** `src/components/survey/SingleQuestionAnonymousSurveyShell.tsx`

Used for anonymous surveys (accessed via access code at `/a/[accessCode]`).

**Additional Features (beyond tracked surveys):**
- Fetches survey data from Sanity API on mount
- Uses `sessionToken` instead of `invitationToken`
- Saves to `/api/anonymous/responses` endpoint
- Supports demographics stage before survey
- Displays anonymity badge and protection messaging
- Filters out demographics questions from main survey flow

**Key Differences from Tracked:**
- Must fetch survey data (tracked surveys receive it as prop)
- Different API endpoint for saving responses
- Different payload format (array of responses)
- Demographics stage handling
- Anonymity UI elements

### Pages Updated

#### 1. Tracked Survey Page
**Location:** `src/app/(survey)/s/[token]/page.tsx`

**Changes:**
```typescript
// BEFORE:
import { SurveyShell } from '@/components/survey/SurveyShell';

// AFTER:
import { SingleQuestionSurveyShell } from '@/components/survey/SingleQuestionSurveyShell';
```

#### 2. Anonymous Survey Page
**Location:** `src/app/(survey)/a/[accessCode]/page.tsx`

**Changes:**
```typescript
// BEFORE:
import AnonymousSurveyShell from '@/components/survey/AnonymousSurveyShell';

// AFTER:
import { SingleQuestionAnonymousSurveyShell } from '@/components/survey/SingleQuestionAnonymousSurveyShell';
```

## User Experience Flow

### Tracked Surveys

1. **Welcome Screen**
   - Survey title and description
   - Estimated time to complete
   - "Begin Survey" button

2. **Single-Question Survey**
   - Progress bar: "Question X of Y" with percentage
   - Section title (context for current question)
   - Question with Likert scale
   - User selects answer
   - Visual feedback: "Answer recorded" ✓
   - Auto-advances after 800ms to next question
   - "Back" button enabled (except on first question)

3. **Last Question**
   - After answering, "Submit Survey" button appears
   - No auto-advance (user must explicitly submit)

4. **Completion Screen**
   - Thank you message
   - Survey closed confirmation

### Anonymous Surveys

1. **Access Code Entry**
   - Enter access code
   - CAPTCHA verification (if enabled)

2. **Demographics Stage** (if configured)
   - All demographics questions on one screen
   - "Continue to Survey" button

3. **Anonymous Badge**
   - "Anonymous Survey" badge displayed throughout
   - Reassurance about confidentiality

4. **Single-Question Survey** (same as tracked)

5. **Completion Screen** (same as tracked)

## Technical Architecture

### State Management

```typescript
// Core state
const [stage, setStage] = useState<SurveyStage>('welcome' | 'survey' | 'completed');
const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
const [answers, setAnswers] = useState<Record<string, number | string>>({});

// UI state
const [isSaving, setIsSaving] = useState(false);
const [isAdvancing, setIsAdvancing] = useState(false);
const [justAnswered, setJustAnswered] = useState(false);

// Refs for timeout management
const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
const advanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
```

### Data Flow

1. **Answer Selection**
   ```
   User clicks → handleAnswer() →
   Update local state (optimistic) →
   Start save timeout (500ms) →
   Start advance timeout (800ms) →
   Save to server →
   Advance to next question
   ```

2. **Back Navigation**
   ```
   User clicks Back → handleBack() →
   Cancel advance timeout →
   Decrement question index →
   Re-render previous question
   ```

3. **LocalStorage Persistence**
   ```
   answers/currentQuestionIndex change →
   useEffect triggers →
   Save to localStorage →
   On mount: restore from localStorage if exists
   ```

## API Integration

### Tracked Surveys

**Save Response:**
```typescript
POST /api/responses
{
  token: string,        // Invitation token
  questionId: string,
  value: number | string
}
```

**Submit Survey:**
```typescript
POST /api/responses/submit
{
  token: string
}
```

### Anonymous Surveys

**Save Response:**
```typescript
PATCH /api/anonymous/responses
{
  sessionToken: string,
  responses: [{
    questionId: string,
    questionNumber: number,
    value?: number,
    textValue?: string
  }]
}
```

**Submit Survey:**
```typescript
POST /api/anonymous/responses/submit
{
  sessionToken: string,
  demographics: Record<string, string>
}
```

## Accessibility

- **Keyboard Navigation:** ← arrow key to go back
- **Focus Management:** Auto-focus on question after transition
- **Screen Readers:** Proper ARIA labels on all interactive elements
- **Visual Feedback:** Clear indicators for saving and answer recording
- **Progress Indication:** Both visual (bar) and text (X of Y)

## Performance Optimizations

1. **Debouncing:** Save and advance operations use timeouts to prevent excessive API calls
2. **Optimistic UI:** Local state updates immediately, server save happens in background
3. **useMemo:** `allQuestions` array wrapped in `useMemo` to prevent recalculation
4. **Framer Motion:** GPU-accelerated transitions for smooth animations
5. **LocalStorage:** Client-side persistence reduces server load and enables resume

## Error Handling

- Server save failures are logged but don't block the user (local state preserved)
- Failed submissions show alert to user with retry option
- Network errors don't prevent navigation (answers saved locally)
- Invalid question IDs are caught and logged

## Testing Recommendations

### Manual Testing Checklist

- [ ] Tracked survey: Welcome → Survey → Submit → Completion
- [ ] Anonymous survey: Access Code → Demographics → Survey → Submit → Completion
- [ ] Auto-advance timing (should be 800ms, not instant)
- [ ] Back button navigation (should cancel auto-advance)
- [ ] Keyboard navigation (← arrow key)
- [ ] Progress bar updates correctly
- [ ] Save indicator appears during save
- [ ] Answer recorded indicator appears after selection
- [ ] LocalStorage persistence (refresh page mid-survey, should resume)
- [ ] Submit button only appears on last question
- [ ] Submit button only enabled after answering last question

### Edge Cases to Test

- [ ] Network failure during save (should continue, save locally)
- [ ] Rapid clicking (debouncing should prevent double-advance)
- [ ] Back navigation during auto-advance animation
- [ ] Page refresh at various stages
- [ ] Multiple tabs (localStorage should sync)
- [ ] Browser back button (should be handled gracefully)

## Future Enhancements

1. **Review Mode:** Allow users to review all answers before submitting
2. **Skip Logic:** Conditional questions based on previous answers
3. **Save & Exit:** Explicit "Save & Exit" button for longer surveys
4. **Progress Persistence:** Server-side progress tracking for multi-device support
5. **Analytics:** Track time per question, dropout rates
6. **A/B Testing:** Test different auto-advance delays

## Migration Notes

### Old Components (Deprecated)

The following components are NO LONGER USED:
- `SurveyShell.tsx` (replaced by SingleQuestionSurveyShell)
- `AnonymousSurveyShell.tsx` (replaced by SingleQuestionAnonymousSurveyShell)

These can be archived or deleted after verifying the new implementation is stable.

### Shared Components Still Used

- `LikertScale5.tsx` - 5-point Likert scale component
- `LikertScale3.tsx` - 3-point Likert scale component
- `DemographicsField.tsx` - Demographics form fields
- `WelcomeScreen.tsx` - Survey welcome screen
- `CompletionScreen.tsx` - Survey completion screen (tracked only)
- `AccessCodeEntry.tsx` - Anonymous access code entry

## References

- Implementation guide: `docs/SINGLE_QUESTION_SURVEY_IMPLEMENTATION_GUIDE.md`
- Audit checklist: `docs/SINGLE_QUESTION_SURVEY_AUDIT.md`
- Research citations: See implementation guide for academic sources

---

**Last Updated:** 2026-02-16
**Version:** 1.0.0
