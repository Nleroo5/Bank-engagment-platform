'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Survey } from '@/types/survey';
import { WelcomeScreen } from './WelcomeScreen';
import { CompletionScreen } from './CompletionScreen';
import { LikertScale5 } from './LikertScale5';
import { LikertScale3 } from './LikertScale3';
import { DemographicsField } from './DemographicsField';
import { ChevronLeft, Save, CheckCircle2 } from 'lucide-react';

interface SingleQuestionSurveyShellProps {
  survey: Survey;
  invitationToken: string;
  existingResponses: Record<string, number | string>;
  isCompleted: boolean;
}

type SurveyStage = 'welcome' | 'survey' | 'completed';

/**
 * Single-Question Auto-Advance Survey Shell
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
 */
export function SingleQuestionSurveyShell({
  survey,
  invitationToken,
  existingResponses,
  isCompleted,
}: SingleQuestionSurveyShellProps) {
  // Core state
  const [stage, setStage] = useState<SurveyStage>(
    isCompleted ? 'completed' : 'welcome'
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>(
    existingResponses
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

  // Flatten all questions from all sections
  const allQuestions = survey.sections.flatMap((section) =>
    section.questions.map((q) => ({
      ...q,
      sectionTitle: section.title,
      sectionDescription: section.description,
    }))
  );

  const totalQuestions = allQuestions.length;
  const currentQuestion = allQuestions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  // Calculate progress percentage
  const progressPercentage = Math.round(
    ((currentQuestionIndex + 1) / totalQuestions) * 100
  );

  // ============================================
  // 1. AUTO-SAVE TO SERVER
  // ============================================
  const saveToServer = useCallback(
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
        console.error('Error saving response to server:', error);
        // Don't block user - local state is saved
      } finally {
        setIsSaving(false);
      }
    },
    [invitationToken]
  );

  // ============================================
  // 2. AUTO-SAVE TO LOCALSTORAGE
  // ============================================
  useEffect(() => {
    if (stage === 'survey') {
      const surveyProgress = {
        surveyId: survey._id,
        currentQuestionIndex,
        answers,
        timestamp: Date.now(),
      };

      localStorage.setItem(
        `survey-progress-${invitationToken}`,
        JSON.stringify(surveyProgress)
      );
    }
  }, [answers, currentQuestionIndex, stage, survey._id, invitationToken]);

  // ============================================
  // 3. RESTORE PROGRESS ON MOUNT
  // ============================================
  useEffect(() => {
    const saved = localStorage.getItem(`survey-progress-${invitationToken}`);
    if (saved && stage === 'welcome') {
      try {
        const { currentQuestionIndex: savedIndex, answers: savedAnswers } =
          JSON.parse(saved);
        // Auto-restore if progress exists
        if (savedIndex > 0 || Object.keys(savedAnswers).length > 0) {
          setCurrentQuestionIndex(savedIndex);
          setAnswers(savedAnswers);
        }
      } catch (error) {
        console.error('Error restoring survey progress:', error);
      }
    }
  }, [invitationToken, stage]);

  // ============================================
  // 4. HANDLE ANSWER WITH AUTO-ADVANCE
  // ============================================
  const handleAnswer = useCallback(
    (questionId: string, value: number | string) => {
      // Prevent double-triggering during advance animation
      if (isAdvancing) return;

      // Update local state immediately (optimistic UI)
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
      setJustAnswered(true);

      // Clear existing save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounced save to server
      saveTimeoutRef.current = setTimeout(() => {
        saveToServer(questionId, value);
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
    [isAdvancing, isLastQuestion, saveToServer]
  );

  // ============================================
  // 5. NAVIGATION HANDLERS
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

  const handleBegin = () => {
    setStage('survey');
  };

  const handleSubmit = async () => {
    try {
      setIsSaving(true);

      // Force save any pending response
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      const response = await fetch('/api/responses/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: invitationToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit survey');
      }

      // Clear saved progress
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

  // ============================================
  // 6. KEYBOARD NAVIGATION
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
  // 7. CLEANUP TIMEOUTS ON UNMOUNT
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
  if (stage === 'welcome') {
    return <WelcomeScreen survey={survey} onBegin={handleBegin} />;
  }

  if (stage === 'completed') {
    return <CompletionScreen survey={survey} />;
  }

  if (!currentQuestion) {
    return null;
  }

  // ============================================
  // RENDER QUESTION INPUT
  // ============================================
  const renderQuestionInput = () => {
    const currentAnswer = answers[currentQuestion._id];

    // Demographics fields
    if (survey.surveyType === 'demographics') {
      const fieldType = currentQuestion.fieldType || currentQuestion.slug?.current || '';
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

    // Likert scales
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

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </span>
          <span className="font-medium text-gray-700">{progressPercentage}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-primary-600 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Save Indicator */}
      {isSaving && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
          <Save className="h-4 w-4 animate-pulse" />
          <span>Saving...</span>
        </div>
      )}

      {/* Answered Indicator */}
      {justAnswered && !isAdvancing && (
        <div className="mb-4 flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <span>Answer recorded</span>
        </div>
      )}

      {/* Question Container with Animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion._id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="mb-8"
        >
          {/* Section context (optional) */}
          {currentQuestion.sectionTitle && (
            <div className="mb-4 text-sm text-gray-500">
              {currentQuestion.sectionTitle}
            </div>
          )}

          {/* Question */}
          {renderQuestionInput()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-6">
        {/* Back Button */}
        <button
          onClick={handleBack}
          disabled={isFirstQuestion || isAdvancing}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        {/* Submit Button (only on last question if answered) */}
        {isLastQuestion && answers[currentQuestion._id] !== undefined && (
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Submitting...
              </>
            ) : (
              'Submit Survey'
            )}
          </button>
        )}
      </div>

      {/* Auto-advance hint */}
      {!isLastQuestion && !answers[currentQuestion._id] && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Select an answer to automatically continue
        </div>
      )}

      {/* Keyboard hint */}
      <div className="mt-4 text-center text-xs text-gray-400">
        Use ← arrow key to go back
      </div>
    </div>
  );
}
