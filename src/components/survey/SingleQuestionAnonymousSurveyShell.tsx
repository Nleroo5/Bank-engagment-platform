'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ChevronLeft, Save, CheckCircle2, ChevronRight } from 'lucide-react';
import type { Survey } from '@/types/survey';
import { LikertScale5 } from './LikertScale5';
import { LikertScale3 } from './LikertScale3';
import { DemographicsField } from './DemographicsField';

interface SingleQuestionAnonymousSurveyShellProps {
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

/**
 * Single-Question Auto-Advance Survey Shell for Anonymous Surveys
 *
 * Features:
 * - Shows one question at a time
 * - Auto-advances after answer selection (800ms delay)
 * - Debounced to prevent accidental clicks
 * - Auto-saves responses to server + localStorage
 * - Smooth transitions between questions
 * - Back navigation supported
 * - Progress indicator
 * - Keyboard support (Arrow keys)
 * - Resume capability after page refresh
 * - Demographics stage before survey
 * - Anonymity badge and protection
 */
export function SingleQuestionAnonymousSurveyShell({
  campaign,
  existingResponses,
  sessionToken,
  demographics: existingDemographics,
}: SingleQuestionAnonymousSurveyShellProps) {
  // Core state
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<SurveyStage>(
    existingDemographics ? 'survey' : 'demographics'
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [demographics, setDemographics] = useState<Record<string, string>>(
    (existingDemographics as Record<string, string> | null) || {}
  );

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [justAnswered, setJustAnswered] = useState(false);

  // Refs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const advanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Constants
  const AUTO_ADVANCE_DELAY = 800; // milliseconds
  const SAVE_DEBOUNCE_DELAY = 500; // milliseconds

  // ============================================
  // 1. FETCH SURVEY DATA FROM SANITY
  // ============================================
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

  // Flatten all questions from all sections (excluding demographics)
  const allQuestions = useMemo(() => {
    if (!survey) return [];

    return survey.sections
      .filter(
        (section) =>
          !section.title.toLowerCase().includes('demographics') &&
          !section.questions.some((q) => q.fieldType)
      )
      .flatMap((section) =>
        section.questions.map((q) => ({
          ...q,
          sectionTitle: section.title,
          sectionDescription: section.description,
        }))
      );
  }, [survey]);

  const totalQuestions = allQuestions.length;
  const currentQuestion = allQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  // Calculate progress percentage
  const progressPercentage = Math.round(
    ((currentQuestionIndex + 1) / totalQuestions) * 100
  );

  // ============================================
  // 2. AUTO-SAVE TO SERVER (Anonymous API)
  // ============================================
  const saveToServer = useCallback(
    async (questionId: string, questionNumber: number, value: number | string) => {
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
        console.error('Error saving response to server:', error);
        // Don't block user - local state is saved
      } finally {
        setIsSaving(false);
      }
    },
    [sessionToken]
  );

  // ============================================
  // 3. AUTO-SAVE TO LOCALSTORAGE
  // ============================================
  useEffect(() => {
    if (stage === 'survey' && survey) {
      const surveyProgress = {
        surveyId: survey._id,
        currentQuestionIndex,
        answers,
        timestamp: Date.now(),
      };

      localStorage.setItem(
        `anonymous-survey-progress-${sessionToken}`,
        JSON.stringify(surveyProgress)
      );
    }
  }, [answers, currentQuestionIndex, stage, survey, sessionToken]);

  // ============================================
  // 4. RESTORE PROGRESS ON MOUNT
  // ============================================
  useEffect(() => {
    const saved = localStorage.getItem(`anonymous-survey-progress-${sessionToken}`);
    if (saved && stage === 'demographics') {
      try {
        const { currentQuestionIndex: savedIndex, answers: savedAnswers } =
          JSON.parse(saved);
        // Auto-restore if progress exists
        if (savedIndex > 0 || Object.keys(savedAnswers).length > 0) {
          setCurrentQuestionIndex(savedIndex);
          setAnswers(savedAnswers);
          // Skip demographics if survey was already started
          if (existingDemographics) {
            setStage('survey');
          }
        }
      } catch (error) {
        console.error('Error restoring survey progress:', error);
      }
    }
  }, [sessionToken, stage, existingDemographics]);

  // ============================================
  // 5. HANDLE ANSWER WITH AUTO-ADVANCE
  // ============================================
  const handleAnswer = useCallback(
    (questionId: string, value: number | string) => {
      // Prevent double-triggering during advance animation
      if (isAdvancing) return;

      // Find question number for this question ID
      const question = allQuestions.find((q) => q._id === questionId);
      if (!question) return;

      // Update local state immediately (optimistic UI)
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
      setJustAnswered(true);

      // Clear existing save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounced save to server
      saveTimeoutRef.current = setTimeout(() => {
        saveToServer(questionId, question.number, value);
      }, SAVE_DEBOUNCE_DELAY);

      // Clear existing advance timeout
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
      }

      // Auto-advance after delay (gives user time to see selection)
      setIsAdvancing(true);
      advanceTimeoutRef.current = setTimeout(() => {
        setJustAnswered(false);

        if (isLastQuestion) {
          // Don't auto-advance on last question - show submit button
          setIsAdvancing(false);
        } else {
          // Advance to next question
          setCurrentQuestionIndex((prev) => prev + 1);
          setIsAdvancing(false);
        }
      }, AUTO_ADVANCE_DELAY);
    },
    [isAdvancing, isLastQuestion, saveToServer, allQuestions]
  );

  // ============================================
  // 6. NAVIGATION HANDLERS
  // ============================================
  const handleBack = useCallback(() => {
    if (currentQuestionIndex > 0 && !isAdvancing) {
      // Clear any pending advance
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
        setIsAdvancing(false);
      }
      setCurrentQuestionIndex((prev) => prev - 1);
      setJustAnswered(false);
    }
  }, [currentQuestionIndex, isAdvancing]);

  const handleDemographicsChange = (field: string, value: string) => {
    setDemographics((prev) => ({ ...prev, [field]: value }));
  };

  const handleDemographicsComplete = () => {
    setStage('survey');
  };

  const handleSubmit = async () => {
    try {
      setIsSaving(true);

      // Force save any pending response
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

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

      // Clear saved progress
      localStorage.removeItem(`anonymous-survey-progress-${sessionToken}`);

      setStage('completed');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error submitting survey:', error);
      alert('Failed to submit survey. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================
  // 7. KEYBOARD NAVIGATION
  // ============================================
  useEffect(() => {
    if (stage !== 'survey') return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Prevent if user is typing in text field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [stage, handleBack]);

  // ============================================
  // 8. CLEANUP TIMEOUTS ON UNMOUNT
  // ============================================
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    };
  }, []);

  // ============================================
  // RENDER STAGES
  // ============================================

  // Loading state
  if (loading || !survey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
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
      <div className="min-h-screen bg-gray-50 px-4 py-8">
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
                className="flex items-center gap-2 rounded-md bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
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

  // Survey stage - ensure we have questions
  if (!currentQuestion) {
    return null;
  }

  // ============================================
  // RENDER QUESTION INPUT
  // ============================================
  const renderQuestionInput = () => {
    const currentAnswer = answers[currentQuestion._id];

    // Likert scales
    if (survey.scale?.scaleType === 'likert5') {
      return (
        <LikertScale5
          questionId={currentQuestion._id}
          questionNumber={currentQuestion.number}
          questionText={currentQuestion.text}
          anchorText={currentQuestion.anchorText}
          value={currentAnswer as number}
          onChange={(id, value) => handleAnswer(id, value)}
          disabled={isSaving || isAdvancing}
        />
      );
    }

    if (survey.scale?.scaleType === 'likert3') {
      return (
        <LikertScale3
          questionId={currentQuestion._id}
          questionNumber={currentQuestion.number}
          questionText={currentQuestion.text}
          anchorText={currentQuestion.anchorText}
          value={currentAnswer as number}
          onChange={(id, value) => handleAnswer(id, value)}
          disabled={isSaving || isAdvancing}
          isReversed={currentQuestion.isReversed}
        />
      );
    }

    return null;
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Anonymity badge - Apple Style */}
        <div className="mb-8 flex items-center justify-center gap-2 rounded-full bg-green-50 px-5 py-2.5 text-sm font-medium text-green-700 shadow-sm">
          <Shield className="h-4 w-4" />
          Anonymous Survey
        </div>

        {/* Progress Bar - Apple Style */}
        <div className="mb-12">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-600">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
            <span className="font-semibold text-primary-600">{progressPercentage}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-600 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Save Indicator - Subtle */}
        {isSaving && (
          <div className="mb-6 flex items-center justify-center gap-2 text-sm text-gray-500">
            <Save className="h-4 w-4 animate-pulse" />
            <span>Saving</span>
          </div>
        )}

        {/* Answered Indicator - Apple Style with Red Accent */}
        <AnimatePresence>
          {justAnswered && !isAdvancing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="mb-6 flex items-center justify-center gap-2"
            >
              <div className="flex items-center gap-2 rounded-full bg-accent-50 px-4 py-2 text-sm font-medium text-accent-600">
                <CheckCircle2 className="h-5 w-5" />
                <span>Answer recorded</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question Container with Apple-style Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion._id}
            initial={{ opacity: 0, x: 30, filter: 'blur(4px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -30, filter: 'blur(4px)' }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="mb-8"
          >
            {/* White Card with Shadow - Apple Style */}
            <div className="overflow-hidden rounded-3xl bg-white shadow-xl transition-shadow duration-300 hover:shadow-2xl">
              <div className="px-8 py-12 md:px-12 md:py-16">
                {/* Section context (optional) */}
                {currentQuestion.sectionTitle && (
                  <div className="mb-4 text-sm font-medium text-gray-500">
                    {currentQuestion.sectionTitle}
                  </div>
                )}

                {/* Question */}
                {renderQuestionInput()}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation - Apple Minimalist Style */}
        <div className="flex items-center justify-between">
          {/* Back Button - Ghost Style */}
          <button
            onClick={handleBack}
            disabled={isFirstQuestion || isAdvancing}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          {/* Submit Button - Pill Shaped CTA (only on last question if answered) */}
          {isLastQuestion && answers[currentQuestion._id] !== undefined && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition-all hover:bg-primary-600 hover:shadow-xl disabled:opacity-40"
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting...
                </>
              ) : (
                'Submit Survey'
              )}
            </motion.button>
          )}
        </div>

        {/* Auto-advance hint - Very Subtle */}
        {!isLastQuestion && !answers[currentQuestion._id] && (
          <div className="mt-6 text-center text-sm text-gray-400">
            Select an answer to automatically continue
          </div>
        )}

        {/* Keyboard hint - Ultra Subtle */}
        <div className="mt-4 text-center text-xs text-gray-300">
          Use ← arrow key to go back
        </div>
      </div>
    </div>
  );
}
