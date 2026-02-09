'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Survey } from '@/types/survey';
import { WelcomeScreen } from './WelcomeScreen';
import { SurveyProgress } from './SurveyProgress';
import { SectionHeader } from './SectionHeader';
import { LikertScale5 } from './LikertScale5';
import { LikertScale3 } from './LikertScale3';
import { DemographicsField } from './DemographicsField';
import { CompletionScreen } from './CompletionScreen';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';

interface SurveyShellProps {
  survey: Survey;
  invitationToken: string;
  existingResponses: Record<string, number | string>;
  isCompleted: boolean;
}

type SurveyStage = 'welcome' | 'survey' | 'completed';

export function SurveyShell({
  survey,
  invitationToken,
  existingResponses,
  isCompleted,
}: SurveyShellProps) {
  const [stage, setStage] = useState<SurveyStage>(
    isCompleted ? 'completed' : 'welcome'
  );
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] =
    useState<Record<string, number | string>>(existingResponses);
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const surveyContainerRef = useRef<HTMLDivElement>(null);

  // Auto-save function
  const saveResponse = useCallback(
    async (questionId: string, value: number | string) => {
      try {
        setIsSaving(true);
        const response = await fetch('/api/responses', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: invitationToken,
            questionId,
            value,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save response');
        }
      } catch (error) {
        console.error('Error saving response:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [invitationToken]
  );

  // Handle answer change with debounced auto-save
  const handleAnswerChange = useCallback(
    (questionId: string, value: number | string) => {
      // Update local state immediately
      setAnswers((prev) => ({ ...prev, [questionId]: value }));

      // Clear existing timeout
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }

      // Set new timeout for auto-save (500ms debounce)
      const timeout = setTimeout(() => {
        saveResponse(questionId, value);
      }, 500);

      setSaveTimeout(timeout);
    },
    [saveResponse, saveTimeout]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  // Calculate derived values
  const currentSection = survey.sections[currentSectionIndex];
  const totalSections = survey.sections.length;
  const allQuestions = survey.sections.flatMap((section) => section.questions);
  const totalQuestions = allQuestions.length;
  const answeredCount = Object.keys(answers).length;
  const currentSectionAnswered = currentSection
    ? currentSection.questions.every((q) => answers[q._id] !== undefined)
    : false;
  const allAnswered = answeredCount === totalQuestions;

  const handleBegin = () => {
    setStage('survey');
  };

  // Return early if no current section (after all hooks)
  if (stage === 'survey' && !currentSection) {
    return null;
  }

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
      // Scroll to survey container top for better mobile UX
      setTimeout(() => {
        surveyContainerRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        });
      }, 0);
    }
  };

  const handleNext = () => {
    if (currentSectionIndex < totalSections - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      // Scroll to survey container top for better mobile UX
      setTimeout(() => {
        surveyContainerRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        });
      }, 0);
    }
  };

  const handleSubmit = async () => {
    if (!allAnswered) {
      alert('Please answer all questions before submitting.');
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch('/api/responses/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: invitationToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit survey');
      }

      setStage('completed');
      // Scroll to top for completion screen
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error submitting survey:', error);
      alert('Failed to submit survey. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (stage === 'welcome') {
    return <WelcomeScreen survey={survey} onBegin={handleBegin} />;
  }

  if (stage === 'completed') {
    return <CompletionScreen survey={survey} />;
  }

  // Safety check for currentSection
  if (!currentSection) {
    return null;
  }

  return (
    <div ref={surveyContainerRef} className="mx-auto max-w-4xl px-4 py-8">
      {/* Progress bar */}
      <SurveyProgress
        totalQuestions={totalQuestions}
        answeredQuestions={answeredCount}
      />

      {/* Save indicator */}
      {isSaving && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
          <Save className="h-4 w-4 animate-pulse" />
          <span>Saving...</span>
        </div>
      )}

      {/* Section header */}
      <SectionHeader
        section={currentSection}
        sectionNumber={currentSectionIndex + 1}
        totalSections={totalSections}
      />

      {/* Questions */}
      <div className="mb-8">
        {currentSection.questions.map((question) => {
          // Check if this is a demographics survey
          if (survey.surveyType === 'demographics') {
            // Extract fieldType from question (could be from question.fieldType or question.slug)
            const fieldType =
              question.fieldType || question.slug?.current || '';

            return (
              <DemographicsField
                key={question._id}
                questionId={question._id}
                questionNumber={question.number}
                questionText={question.text}
                fieldType={fieldType}
                value={answers[question._id] as string}
                onChange={handleAnswerChange}
                disabled={isSaving}
              />
            );
          }

          // For Likert surveys
          const scaleType = survey.scale?.scaleType || 'likert5';

          if (scaleType === 'likert5') {
            return (
              <LikertScale5
                key={question._id}
                questionId={question._id}
                questionNumber={question.number}
                questionText={question.text}
                anchorText={question.anchorText}
                value={answers[question._id] as number}
                onChange={handleAnswerChange}
                disabled={isSaving}
              />
            );
          }

          if (scaleType === 'likert3') {
            return (
              <LikertScale3
                key={question._id}
                questionId={question._id}
                questionNumber={question.number}
                questionText={question.text}
                anchorText={question.anchorText}
                value={answers[question._id] as number}
                onChange={handleAnswerChange}
                disabled={isSaving}
                isReversed={question.isReversed}
              />
            );
          }

          return null;
        })}
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 border-t border-gray-200 bg-white py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentSectionIndex === 0}
            className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="text-sm text-gray-600">
            Section {currentSectionIndex + 1} of {totalSections}
          </div>

          {currentSectionIndex < totalSections - 1 ? (
            <button
              onClick={handleNext}
              disabled={!currentSectionAnswered}
              className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || isSaving}
              className="rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Submitting...' : 'Submit Survey'}
            </button>
          )}
        </div>

        {!currentSectionAnswered && currentSectionIndex < totalSections - 1 && (
          <p className="mt-2 text-center text-sm text-orange-600">
            Please answer all questions in this section to continue
          </p>
        )}

        {currentSectionIndex === totalSections - 1 && !allAnswered && (
          <p className="mt-2 text-center text-sm text-orange-600">
            Please answer all questions to submit the survey
          </p>
        )}
      </div>
    </div>
  );
}
