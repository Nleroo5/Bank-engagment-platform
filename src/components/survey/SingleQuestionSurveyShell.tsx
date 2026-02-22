'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import type { Survey } from '@/types/survey';
import { WelcomeScreen } from './WelcomeScreen';
import { CompletionScreen } from './CompletionScreen';
import { LikertScale5 } from './LikertScale5';
import { LikertScale3 } from './LikertScale3';
import { DemographicsField } from './DemographicsField';
import { ChevronLeft, Save, CheckCircle2 } from 'lucide-react';

type DemographicsQuestion = {
  _id: string;
  number: number;
  text: string;
  fieldType: string;
};

interface SingleQuestionSurveyShellProps {
  survey: Survey;
  invitationToken: string;
  existingResponses: Record<string, number | string>;
  isCompleted: boolean;
  demographicsQuestions?: DemographicsQuestion[];
}

type SurveyStage = 'demographics' | 'welcome' | 'survey' | 'completed';

// Radio-group field types: auto-advance on selection
const AUTO_ADVANCE_FIELDS = new Set([
  'device',
  'employmentStatus',
  'gender',
  'timeAtBank',
  'bankExperience',
]);

const AUTO_ADVANCE_DELAY = 800; // ms
const SAVE_DEBOUNCE_DELAY = 500; // ms

/**
 * Single-Question Auto-Advance Survey Shell
 *
 * Features:
 * - Demographics preamble stage (one question at a time) before every survey
 * - Auto-advances after answer selection (800ms delay)
 * - Debounced to prevent accidental clicks
 * - Auto-saves responses to server + localStorage
 * - Smooth transitions between questions
 * - Back navigation supported
 * - Progress indicator
 * - Keyboard support (Arrow keys)
 * - Resume capability after page refresh
 */
export function SingleQuestionSurveyShell({
  survey,
  invitationToken,
  existingResponses,
  isCompleted,
  demographicsQuestions = [],
}: SingleQuestionSurveyShellProps) {
  // ── Core state ────────────────────────────────────────────────────────────
  const [stage, setStage] = useState<SurveyStage>(
    isCompleted
      ? 'completed'
      : demographicsQuestions.length > 0
        ? 'demographics'
        : 'welcome'
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>(
    existingResponses
  );

  // ── Demographics state ────────────────────────────────────────────────────
  const [currentDemoIndex, setCurrentDemoIndex] = useState(0);
  const [demoAnswers, setDemoAnswers] = useState<Record<string, string>>({});
  const [isDemoAdvancing, setIsDemoAdvancing] = useState(false);
  const [isDemoCompleting, setIsDemoCompleting] = useState(false);

  // ── Survey UI state ───────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [justAnswered, setJustAnswered] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const advanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const demoAdvanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Derived: survey questions ─────────────────────────────────────────────
  const allQuestions = survey.sections.flatMap((section) =>
    section.questions.map((q) => ({
      ...q,
      sectionTitle: section.title,
      sectionDescription: section.description,
    }))
  );

  const totalQuestions = allQuestions.length;
  const currentQuestion = allQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const progressPercentage = Math.round(
    ((currentQuestionIndex + 1) / totalQuestions) * 100
  );

  // ── Derived: demographics ─────────────────────────────────────────────────
  const totalDemoQuestions = demographicsQuestions.length;
  const currentDemoQuestion = demographicsQuestions[currentDemoIndex];
  const demoProgressPercentage =
    totalDemoQuestions > 0
      ? Math.round(((currentDemoIndex + 1) / totalDemoQuestions) * 100)
      : 0;

  // ============================================================
  // 1. SAVE SURVEY ANSWER TO SERVER
  // ============================================================
  const saveToServer = useCallback(
    async (questionId: string, value: number | string) => {
      try {
        setIsSaving(true);
        const res = await fetch('/api/responses', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: invitationToken, questionId, value }),
        });
        if (!res.ok) throw new Error('Failed to save response');
      } catch (error) {
        console.error('Error saving response:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [invitationToken]
  );

  // ============================================================
  // 2. SAVE DEMOGRAPHICS ANSWER TO SERVER
  // ============================================================
  const saveDemoToServer = useCallback(
    async (questionId: string, value: string, questionNumber: number) => {
      try {
        await fetch('/api/responses', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: invitationToken,
            questionId,
            value,
            questionNumber,
          }),
        });
      } catch (error) {
        console.error('Error saving demographics answer:', error);
      }
    },
    [invitationToken]
  );

  // ============================================================
  // 3. COMPLETE DEMOGRAPHICS (stamp flag, advance to welcome)
  // ============================================================
  const completeDemographics = useCallback(async () => {
    try {
      setIsDemoCompleting(true);
      await fetch('/api/responses/demographics-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: invitationToken }),
      });
      setStage('welcome');
    } catch (error) {
      console.error('Error completing demographics:', error);
    } finally {
      setIsDemoCompleting(false);
    }
  }, [invitationToken]);

  // ============================================================
  // 4. DEMOGRAPHICS NEXT / ADVANCE
  // ============================================================
  const handleDemographicsNext = useCallback(async () => {
    if (isDemoAdvancing || isDemoCompleting) return;
    const isLast = currentDemoIndex === totalDemoQuestions - 1;
    if (isLast) {
      await completeDemographics();
    } else {
      setCurrentDemoIndex((prev) => prev + 1);
    }
  }, [
    isDemoAdvancing,
    isDemoCompleting,
    currentDemoIndex,
    totalDemoQuestions,
    completeDemographics,
  ]);

  // ============================================================
  // 5. DEMOGRAPHICS CHANGE HANDLER
  // ============================================================
  const handleDemographicsChange = useCallback(
    (questionId: string, value: string) => {
      if (isDemoAdvancing || isDemoCompleting) return;

      setDemoAnswers((prev) => ({ ...prev, [questionId]: value }));
      void saveDemoToServer(questionId, value, currentDemoQuestion?.number ?? 0);

      const fieldType = currentDemoQuestion?.fieldType ?? '';
      if (AUTO_ADVANCE_FIELDS.has(fieldType)) {
        setIsDemoAdvancing(true);
        if (demoAdvanceTimeoutRef.current) {
          clearTimeout(demoAdvanceTimeoutRef.current);
        }
        demoAdvanceTimeoutRef.current = setTimeout(() => {
          setIsDemoAdvancing(false);
          void handleDemographicsNext();
        }, AUTO_ADVANCE_DELAY);
      }
    },
    [
      isDemoAdvancing,
      isDemoCompleting,
      currentDemoQuestion,
      saveDemoToServer,
      handleDemographicsNext,
    ]
  );

  // ============================================================
  // 6. AUTO-SAVE SURVEY PROGRESS TO LOCALSTORAGE
  // ============================================================
  useEffect(() => {
    if (stage === 'survey') {
      localStorage.setItem(
        `survey-progress-${invitationToken}`,
        JSON.stringify({
          surveyId: survey._id,
          currentQuestionIndex,
          answers,
          timestamp: Date.now(),
        })
      );
    }
  }, [answers, currentQuestionIndex, stage, survey._id, invitationToken]);

  // ============================================================
  // 7. RESTORE SURVEY PROGRESS ON MOUNT
  // ============================================================
  useEffect(() => {
    const saved = localStorage.getItem(`survey-progress-${invitationToken}`);
    if (saved && stage === 'welcome') {
      try {
        const { currentQuestionIndex: savedIndex, answers: savedAnswers } =
          JSON.parse(saved);
        if (savedIndex > 0 || Object.keys(savedAnswers).length > 0) {
          setCurrentQuestionIndex(savedIndex);
          setAnswers(savedAnswers);
        }
      } catch (error) {
        console.error('Error restoring survey progress:', error);
      }
    }
  }, [invitationToken, stage]);

  // ============================================================
  // 8. HANDLE SURVEY ANSWER WITH AUTO-ADVANCE
  // ============================================================
  const handleAnswer = useCallback(
    (questionId: string, value: number | string) => {
      if (isAdvancing) return;

      setAnswers((prev) => ({ ...prev, [questionId]: value }));
      setJustAnswered(true);

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        void saveToServer(questionId, value);
      }, SAVE_DEBOUNCE_DELAY);

      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
      setIsAdvancing(true);
      advanceTimeoutRef.current = setTimeout(() => {
        setJustAnswered(false);
        if (isLastQuestion) {
          setIsAdvancing(false);
        } else {
          setCurrentQuestionIndex((prev) => prev + 1);
          setIsAdvancing(false);
        }
      }, AUTO_ADVANCE_DELAY);
    },
    [isAdvancing, isLastQuestion, saveToServer]
  );

  // ============================================================
  // 9. SURVEY NAVIGATION
  // ============================================================
  const handleBack = useCallback(() => {
    if (currentQuestionIndex > 0 && !isAdvancing) {
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
        setIsAdvancing(false);
      }
      setCurrentQuestionIndex((prev) => prev - 1);
      setJustAnswered(false);
    }
  }, [currentQuestionIndex, isAdvancing]);

  const handleBegin = () => setStage('survey');

  // ============================================================
  // 10. SUBMIT SURVEY
  // ============================================================
  const handleSubmit = async () => {
    try {
      setIsSaving(true);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      const response = await fetch('/api/responses/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: invitationToken }),
      });

      if (!response.ok) throw new Error('Failed to submit survey');

      localStorage.removeItem(`survey-progress-${invitationToken}`);
      setStage('completed');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error submitting survey:', error);
      alert('Failed to submit survey. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================
  // 11. KEYBOARD NAVIGATION
  // ============================================================
  useEffect(() => {
    if (stage !== 'survey') return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
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

  // ============================================================
  // 12. CLEANUP TIMEOUTS ON UNMOUNT
  // ============================================================
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
      if (demoAdvanceTimeoutRef.current)
        clearTimeout(demoAdvanceTimeoutRef.current);
    };
  }, []);

  // ============================================================
  // RENDER: DEMOGRAPHICS STAGE
  // ============================================================
  if (stage === 'demographics') {
    // Safety: no demographics questions — skip straight to welcome
    if (!currentDemoQuestion) {
      return <WelcomeScreen survey={survey} onBegin={handleBegin} />;
    }

    const currentDemoAnswer = demoAnswers[currentDemoQuestion._id];
    const isAutoAdvanceField = AUTO_ADVANCE_FIELDS.has(
      currentDemoQuestion.fieldType
    );
    const canAdvance = Boolean(currentDemoAnswer);
    const isLastDemo = currentDemoIndex === totalDemoQuestions - 1;

    return (
      <div className="min-h-screen bg-white px-4 py-12">
        <div className="mx-auto max-w-2xl">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <Image
              src="/header-logo.png"
              alt="Logo"
              width={260}
              height={87}
              priority
              className="h-auto w-auto"
            />
          </div>

          {/* Progress */}
          <div className="mb-12">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium text-gray-600">
                Demographics: {currentDemoIndex + 1} of {totalDemoQuestions}
              </span>
              <span className="font-semibold text-primary-600">
                {demoProgressPercentage}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-600 ease-out"
                style={{ width: `${demoProgressPercentage}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentDemoQuestion._id}
              initial={{ opacity: 0, x: 30, filter: 'blur(4px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: -30, filter: 'blur(4px)' }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="mb-8"
            >
              <div className="overflow-hidden rounded-3xl bg-white shadow-xl transition-shadow duration-300 hover:shadow-2xl">
                <div className="px-8 py-12 md:px-12 md:py-16">
                  <DemographicsField
                    questionId={currentDemoQuestion._id}
                    questionNumber={currentDemoQuestion.number}
                    questionText={currentDemoQuestion.text}
                    fieldType={currentDemoQuestion.fieldType}
                    value={currentDemoAnswer ?? ''}
                    onChange={handleDemographicsChange}
                    disabled={isDemoAdvancing || isDemoCompleting}
                  />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Next / Begin button (text & dropdown fields) */}
          <div className="flex items-center justify-end">
            {!isAutoAdvanceField && canAdvance && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => void handleDemographicsNext()}
                disabled={isDemoAdvancing || isDemoCompleting}
                className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition-all hover:bg-primary-600 hover:shadow-xl disabled:opacity-40"
              >
                {isDemoCompleting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : isLastDemo ? (
                  'Begin Survey'
                ) : (
                  'Next'
                )}
              </motion.button>
            )}
          </div>

          {/* Auto-advance hint for radio fields */}
          {isAutoAdvanceField && !currentDemoAnswer && (
            <div className="mt-6 text-center text-sm text-gray-400">
              Select an answer to automatically continue
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: WELCOME / COMPLETED
  // ============================================================
  if (stage === 'welcome') {
    return <WelcomeScreen survey={survey} onBegin={handleBegin} />;
  }

  if (stage === 'completed') {
    return <CompletionScreen survey={survey} />;
  }

  if (!currentQuestion) {
    return null;
  }

  // ============================================================
  // RENDER: SURVEY QUESTION INPUT
  // ============================================================
  const renderQuestionInput = () => {
    const currentAnswer = answers[currentQuestion._id];

    if (survey.surveyType === 'demographics') {
      const fieldType =
        currentQuestion.fieldType || currentQuestion.slug?.current || '';
      return (
        <DemographicsField
          questionId={currentQuestion._id}
          questionNumber={currentQuestion.number}
          questionText={currentQuestion.text}
          fieldType={fieldType}
          value={currentAnswer as string}
          onChange={(id, value) => handleAnswer(id, value)}
          disabled={isSaving || isAdvancing}
        />
      );
    }

    if (survey.surveyType === 'likert5') {
      return (
        <LikertScale5
          questionId={currentQuestion._id}
          questionNumber={currentQuestion.number}
          questionText={currentQuestion.text}
          value={currentAnswer as number}
          onChange={(id, value) => handleAnswer(id, value)}
          disabled={isSaving || isAdvancing}
        />
      );
    }

    if (survey.surveyType === 'likert3') {
      return (
        <LikertScale3
          questionId={currentQuestion._id}
          questionNumber={currentQuestion.number}
          questionText={currentQuestion.text}
          value={currentAnswer as number}
          onChange={(id, value) => handleAnswer(id, value)}
          disabled={isSaving || isAdvancing}
        />
      );
    }

    return null;
  };

  // ============================================================
  // RENDER: MAIN SURVEY
  // ============================================================
  return (
    <div className="min-h-screen bg-white px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/header-logo.png"
            alt="Logo"
            width={260}
            height={87}
            priority
            className="h-auto w-auto"
          />
        </div>

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-600">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
            <span className="font-semibold text-primary-600">
              {progressPercentage}%
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-600 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Save Indicator */}
        {isSaving && (
          <div className="mb-6 flex items-center justify-center gap-2 text-sm text-gray-500">
            <Save className="h-4 w-4 animate-pulse" />
            <span>Saving</span>
          </div>
        )}

        {/* Answer Recorded Indicator */}
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

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion._id}
            initial={{ opacity: 0, x: 30, filter: 'blur(4px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -30, filter: 'blur(4px)' }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="mb-8"
          >
            <div className="overflow-hidden rounded-3xl bg-white shadow-xl transition-shadow duration-300 hover:shadow-2xl">
              <div className="px-8 py-12 md:px-12 md:py-16">
                {currentQuestion.sectionTitle && (
                  <div className="mb-4 text-sm font-medium text-gray-500">
                    {currentQuestion.sectionTitle}
                  </div>
                )}
                {renderQuestionInput()}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={isFirstQuestion || isAdvancing}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

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

        {/* Auto-advance hint */}
        {!isLastQuestion && !answers[currentQuestion._id] && (
          <div className="mt-6 text-center text-sm text-gray-400">
            Select an answer to automatically continue
          </div>
        )}

        {/* Keyboard hint */}
        <div className="mt-4 text-center text-xs text-gray-300">
          Use ← arrow key to go back
        </div>
      </div>
    </div>
  );
}
