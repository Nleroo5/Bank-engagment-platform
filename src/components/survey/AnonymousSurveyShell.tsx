'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { SurveyProgress } from './SurveyProgress';
import { SectionHeader } from './SectionHeader';
import { LikertScale5 } from './LikertScale5';
import { LikertScale3 } from './LikertScale3';
import { DemographicsField } from './DemographicsField';
import type { Survey } from '@/types/survey';

interface AnonymousSurveyShellProps {
  campaign: {
    id: string;
    surveyTitle: string;
    surveyId: string;
    endDate: Date | null;
  };
  existingResponses: Array<{
    questionId: string;
    questionNumber: number;
    value: number | null;
    textValue: string | null;
  }>;
  sessionToken: string;
  demographics: Record<string, unknown> | null;
}

type SurveyStage = 'demographics' | 'survey' | 'completed';

export default function AnonymousSurveyShell({
  campaign,
  existingResponses,
  sessionToken,
  demographics: existingDemographics,
}: AnonymousSurveyShellProps) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<SurveyStage>(
    existingDemographics ? 'survey' : 'demographics'
  );
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [demographics, setDemographics] = useState<Record<string, string>>(
    (existingDemographics as Record<string, string> | null) || {}
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const surveyContainerRef = useRef<HTMLDivElement>(null);

  // Fetch survey data from Sanity
  useEffect(() => {
    async function fetchSurvey() {
      try {
        const response = await fetch(
          `/api/sanity/surveys?surveyId=${campaign.surveyId}`
        );
        if (!response.ok) throw new Error('Failed to fetch survey');

        const surveyData = await response.json();
        setSurvey(surveyData);

        // Load existing responses into state
        const responseMap: Record<string, number | string> = {};
        existingResponses.forEach((r) => {
          if (r.value !== null) {
            responseMap[r.questionId] = r.value;
          } else if (r.textValue !== null) {
            responseMap[r.questionId] = r.textValue;
          }
        });
        setAnswers(responseMap);
      } catch (error) {
        console.error('Error fetching survey:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSurvey();
  }, [campaign.surveyId, existingResponses]);

  // Auto-save function
  const saveResponse = useCallback(
    async (
      questionId: string,
      questionNumber: number,
      value: number | string
    ) => {
      try {
        setIsSaving(true);
        const response = await fetch('/api/anonymous/responses', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionToken,
            responses: [
              {
                questionId: questionId,
                questionNumber,
                ...(typeof value === 'number'
                  ? { value }
                  : { textValue: value }),
              },
            ],
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
    [sessionToken]
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

      // Find question number for this question ID
      const question = survey?.sections
        .flatMap((s) => s.questions)
        .find((q) => q._id === questionId);

      if (!question) return;

      // Set new timeout for auto-save (500ms debounce)
      const timeout = setTimeout(() => {
        saveResponse(questionId, question.number, value);
      }, 500);

      setSaveTimeout(timeout);
    },
    [saveResponse, saveTimeout, survey]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  const handleDemographicsChange = (field: string, value: string) => {
    setDemographics((prev) => ({ ...prev, [field]: value }));
  };

  const handleDemographicsComplete = () => {
    setStage('survey');
  };

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      setIsNavigating(true);
      setCurrentSectionIndex(currentSectionIndex - 1);
      setTimeout(() => {
        surveyContainerRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        setTimeout(() => setIsNavigating(false), 500);
      }, 0);
    }
  };

  const handleNext = () => {
    if (!survey) return;
    if (currentSectionIndex < survey.sections.length - 1) {
      setIsNavigating(true);
      setCurrentSectionIndex(currentSectionIndex + 1);
      setTimeout(() => {
        surveyContainerRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        setTimeout(() => setIsNavigating(false), 500);
      }, 0);
    }
  };

  const handleSubmit = async () => {
    if (!survey) return;

    const allQuestions = survey.sections.flatMap((s) => s.questions);
    const allAnswered = allQuestions.every((q) => answers[q._id] !== undefined);

    if (!allAnswered) {
      alert('Please answer all questions before submitting.');
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch('/api/anonymous/responses/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          demographics,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit survey');
      }

      setStage('completed');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error submitting survey:', error);
      alert('Failed to submit survey. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (loading || !survey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
          <p className="text-gray-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  // Demographics stage
  if (stage === 'demographics') {
    // Check if demographics questions exist in survey
    const demographicsSection = survey.sections.find(
      (s) =>
        s.title.toLowerCase().includes('demographics') ||
        s.questions.some((q) => q.fieldType)
    );

    if (!demographicsSection) {
      // No demographics section, skip to survey
      setStage('survey');
      return null;
    }

    const allDemographicsAnswered = demographicsSection.questions.every(
      (q) => demographics[q.fieldType || q._id]
    );

    return (
      <div className="min-h-screen bg-white px-4 py-8">
        <div className="mx-auto max-w-4xl">
          {/* Anonymity badge */}
          <div className="mb-6 flex items-center justify-center gap-2 rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-800">
            <Shield className="h-4 w-4" />
            Anonymous Survey - Your responses are completely confidential
          </div>

          <div className="rounded-lg bg-white p-8 shadow">
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              {survey.title}
            </h1>
            <h2 className="mb-6 text-lg text-gray-600">
              Demographics Information
            </h2>

            <p className="mb-6 text-sm text-gray-700">
              Please provide some basic information. This data is stored
              separately from your survey responses and is only used for
              aggregate reporting. Individual responses are never visible to
              administrators.
            </p>

            <div className="space-y-4">
              {demographicsSection.questions.map((question) => (
                <DemographicsField
                  key={question._id}
                  questionId={question._id}
                  questionNumber={question.number}
                  questionText={question.text}
                  fieldType={question.fieldType || question.slug?.current || ''}
                  value={demographics[question.fieldType || question._id] || ''}
                  onChange={(_, value) =>
                    handleDemographicsChange(
                      question.fieldType || question._id,
                      value as string
                    )
                  }
                  disabled={false}
                />
              ))}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleDemographicsComplete}
                disabled={!allDemographicsAnswered}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue to Survey
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {!allDemographicsAnswered && (
              <p className="mt-4 text-center text-sm text-orange-600">
                Please complete all fields to continue
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Completed stage
  if (stage === 'completed') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-green-100 p-4">
              <Shield className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <h1 className="mb-4 text-center text-2xl font-bold text-green-600">
            Thank You!
          </h1>
          <p className="mb-4 text-center text-gray-700">
            Your anonymous responses have been recorded.
          </p>
          <p className="text-center text-sm text-gray-600">
            You may now close this window. Your feedback is valuable and will
            help improve our organization.
          </p>
        </div>
      </div>
    );
  }

  // Survey stage
  const currentSection = survey.sections[currentSectionIndex];
  const totalSections = survey.sections.length;
  const allQuestions = survey.sections.flatMap((s) => s.questions);
  const totalQuestions = allQuestions.length;
  const answeredCount = Object.keys(answers).length;
  const currentSectionAnswered = currentSection
    ? currentSection.questions.every((q) => answers[q._id] !== undefined)
    : false;
  const allAnswered = answeredCount === totalQuestions;

  // Safety check - should never happen but TypeScript requires it
  if (!currentSection) {
    return <div>Error: Invalid section</div>;
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div ref={surveyContainerRef} className="mx-auto max-w-4xl px-4">
        {/* Anonymity badge */}
        <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-800">
          <Shield className="h-4 w-4" />
          Anonymous Survey
        </div>

        {/* Progress bar */}
        <SurveyProgress
          totalQuestions={totalQuestions}
          answeredQuestions={answeredCount}
        />

        {/* Navigation loading indicator */}
        {isNavigating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-lg bg-white p-6 shadow-lg">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <span className="text-sm font-medium text-gray-700">
                Loading section...
              </span>
            </div>
          </div>
        )}

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
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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

          {!currentSectionAnswered &&
            currentSectionIndex < totalSections - 1 && (
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
    </div>
  );
}
