'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Shield, ChevronLeft, Save, CheckCircle2, ChevronRight } from 'lucide-react';
import type { Survey, DemographicsQuestionConfig } from '@/types/survey';
import { LikertScale5 } from './LikertScale5';
import { LikertScale3 } from './LikertScale3';
import { DemographicsField } from './DemographicsField';
import { ConfettiEffect } from './ConfettiEffect';

// ── Module-level constants ─────────────────────────────────────────────────────
const AUTO_ADVANCE_DELAY = 800; // ms
const SAVE_DEBOUNCE_DELAY = 500; // ms

/** Shape of a demographics question fetched from the database. */
interface DBDemoQuestion {
  _id: string;           // demographicKey from config (used as storage key)
  number: number;
  text: string;
  fieldType: string;
  inputType: 'text' | 'dropdown' | 'radio';
  options: string[];
  allowOther: boolean;
  placeholder: string;
  autoAdvance: boolean;
}

// ── Hardcoded demographics questions (used as primary source OR fallback) ──────
const DEMOGRAPHICS_QUESTIONS: DBDemoQuestion[] = [
  {
    _id: 'bankName',
    number: 1,
    text: 'Name of Bank',
    fieldType: 'bankName',
    inputType: 'text',
    options: [],
    allowOther: false,
    placeholder: 'Enter your bank name',
    autoAdvance: false,
  },
  {
    _id: 'country',
    number: 2,
    text: 'Country',
    fieldType: 'country',
    inputType: 'dropdown',
    options: [
      'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany',
      'France', 'Japan', 'Singapore', 'Hong Kong', 'India',
      'Brazil', 'Mexico', 'South Africa', 'United Arab Emirates', 'Switzerland',
    ],
    allowOther: true,
    placeholder: 'Select your country',
    autoAdvance: false,
  },
  {
    _id: 'state',
    number: 3,
    text: 'State/Province',
    fieldType: 'state',
    inputType: 'dropdown',
    options: [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
      'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
      'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
      'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
      'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
      'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
      'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
      'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
      'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
      'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
      'District of Columbia',
    ],
    allowOther: true,
    placeholder: 'Select your state or province',
    autoAdvance: false,
  },
  {
    _id: 'metroArea',
    number: 4,
    text: 'Metro City Area',
    fieldType: 'metroArea',
    inputType: 'text',
    options: [],
    allowOther: false,
    placeholder: 'Enter your metro area',
    autoAdvance: false,
  },
  {
    _id: 'city',
    number: 5,
    text: 'City',
    fieldType: 'city',
    inputType: 'text',
    options: [],
    allowOther: false,
    placeholder: 'Enter your city',
    autoAdvance: false,
  },
  {
    _id: 'bankSize',
    number: 6,
    text: 'Size of Bank (Total Assets)',
    fieldType: 'bankSize',
    inputType: 'dropdown',
    options: [
      'Under $100 Million',
      '$100 Million - $500 Million',
      '$500 Million - $1 Billion',
      '$1 Billion - $5 Billion',
      '$5 Billion - $10 Billion',
      '$10 Billion - $20 Billion',
      '$20 Billion - $50 Billion',
      '$50 Billion - $100 Billion',
      '$100 Billion - $500 Billion',
      '$500 Billion - $1 Trillion',
      '$1 Trillion - $2 Trillion',
      'Over $2 Trillion',
    ],
    allowOther: false,
    placeholder: 'Select bank size',
    autoAdvance: false,
  },
  {
    _id: 'device',
    number: 7,
    text: 'Device Used',
    fieldType: 'device',
    inputType: 'radio',
    options: ['Desktop', 'Laptop', 'Tablet', 'Mobile Phone'],
    allowOther: false,
    placeholder: '',
    autoAdvance: true,
  },
  {
    _id: 'employmentStatus',
    number: 8,
    text: 'Employment Status',
    fieldType: 'employmentStatus',
    inputType: 'radio',
    options: ['Full-time', 'Part-time', 'Contract', 'Temporary'],
    allowOther: false,
    placeholder: '',
    autoAdvance: true,
  },
  {
    _id: 'gender',
    number: 9,
    text: 'Gender',
    fieldType: 'gender',
    inputType: 'radio',
    options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
    allowOther: false,
    placeholder: '',
    autoAdvance: true,
  },
  {
    _id: 'timeAtBank',
    number: 10,
    text: 'Time at Current Bank',
    fieldType: 'timeAtBank',
    inputType: 'radio',
    options: [
      'Less than 1 year', '1-2 years', '3-5 years',
      '5-10 years', '10-20 years', '20+ years',
    ],
    allowOther: false,
    placeholder: '',
    autoAdvance: true,
  },
  {
    _id: 'bankExperience',
    number: 11,
    text: 'Banking Industry Experience',
    fieldType: 'bankExperience',
    inputType: 'radio',
    options: [
      'Less than 1 year', '1-2 years', '3-5 years',
      '5-10 years', '10-20 years', '20+ years',
    ],
    allowOther: false,
    placeholder: '',
    autoAdvance: true,
  },
  {
    _id: 'division',
    number: 12,
    text: 'Bank Division',
    fieldType: 'division',
    inputType: 'dropdown',
    options: [
      'Retail Banking', 'Commercial Banking', 'Wealth Management',
      'Investment Banking', 'Risk Management', 'Operations',
      'Technology / IT', 'Human Resources', 'Compliance / Legal',
      'Marketing', 'Finance / Accounting',
    ],
    allowOther: true,
    placeholder: 'Select your division',
    autoAdvance: false,
  },
  {
    _id: 'jobRole',
    number: 13,
    text: 'Job Role/Title',
    fieldType: 'jobRole',
    inputType: 'dropdown',
    options: [
      'Teller / Customer Service Representative',
      'Personal Banker / Relationship Manager',
      'Loan Officer / Underwriter',
      'Branch Manager',
      'Assistant Vice President (AVP)',
      'Vice President (VP)',
      'Senior Vice President (SVP)',
      'Executive Vice President (EVP)',
      'C-Suite (CEO, CFO, COO, CIO, etc.)',
      'Director', 'Manager', 'Analyst', 'Specialist',
      'Coordinator', 'Administrative / Support', 'Intern',
    ],
    allowOther: true,
    placeholder: 'Select your role',
    autoAdvance: false,
  },
];

interface SingleQuestionAnonymousSurveyShellProps {
  campaign: {
    id: string;
    surveyTitle: string;
    surveyId: string;
    endDate: Date | null;
    isAnonymous?: boolean;
    splashConfig?: unknown;
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
 * Flow:
 *   1. Demographics stage  — questions fetched from DB (surveyType=demographics)
 *   2. Survey stage        — Likert questions fetched from database
 *   3. Completed stage     — thank-you screen
 *
 * Demographics are stored as JSON on AnonymousResponse.demographics.
 * If that JSON already exists (session resume), demographics stage is skipped.
 */
export function SingleQuestionAnonymousSurveyShell({
  campaign,
  existingResponses,
  sessionToken,
  demographics: existingDemographics,
}: SingleQuestionAnonymousSurveyShellProps) {
  // ── Core state ────────────────────────────────────────────────────────────
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  // Stage logic:
  // - No demographics yet → start at demographics
  // - Demographics done → go straight to survey (welcome was already shown on first entry)
  const [stage, setStage] = useState<SurveyStage>(() => {
    if (!existingDemographics) return 'demographics';
    return 'survey';
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});

  // ── Demographics state (DB-driven) ──────────────────────────────────────
  const [demoQuestions, setDemoQuestions] = useState<DBDemoQuestion[]>([]);
  const [demoLoading, setDemoLoading] = useState(true);
  const [currentDemoIndex, setCurrentDemoIndex] = useState(0);
  const [demoAnswers, setDemoAnswers] = useState<Record<string, string>>(
    (existingDemographics as Record<string, string> | null) ?? {}
  );
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

  // ── Derived: current demo question ────────────────────────────────────────
  const currentDemoQuestion = demoQuestions[currentDemoIndex] ?? null;
  const totalDemoQuestions = demoQuestions.length;
  const demoProgressPercentage = totalDemoQuestions > 0
    ? Math.round(((currentDemoIndex + 1) / totalDemoQuestions) * 100)
    : 0;

  // ============================================
  // 0. LOAD DEMOGRAPHICS QUESTIONS
  // Uses hardcoded defaults. If DB has config, those values override.
  // ============================================
  useEffect(() => {
    async function loadDemographics() {
      // Start with hardcoded defaults
      let questions = [...DEMOGRAPHICS_QUESTIONS];

      // Try to fetch DB config to override defaults
      try {
        const res = await fetch('/api/public/surveys?surveyType=demographics');
        if (res.ok) {
          const data = await res.json();
          const dbQuestions = (data.sections ?? [])
            .flatMap((section: { questions: Array<{
              _id: string;
              number: number;
              text: string;
              config: DemographicsQuestionConfig | null;
            }> }) => section.questions);

          // If DB has questions with config, use them instead
          const dbWithConfig = dbQuestions.filter(
            (q: { config: DemographicsQuestionConfig | null }) => q.config !== null
          );

          if (dbWithConfig.length > 0) {
            questions = dbWithConfig.map((q: {
              _id: string;
              number: number;
              text: string;
              config: DemographicsQuestionConfig;
            }) => ({
              _id: q.config.demographicKey ?? q._id,
              number: q.number,
              text: q.text,
              fieldType: q.config.fieldType ?? '',
              inputType: q.config.inputType ?? 'text',
              options: q.config.options ?? [],
              allowOther: q.config.allowOther ?? false,
              placeholder: q.config.placeholder ?? '',
              autoAdvance: q.config.autoAdvance ?? false,
            } satisfies DBDemoQuestion));
          }
        }
      } catch (error) {
        console.error('Error fetching demographics from DB, using defaults:', error);
      }

      setDemoQuestions(questions);
      setDemoLoading(false);
    }

    if (stage === 'demographics' || !existingDemographics) {
      loadDemographics();
    } else {
      setDemoLoading(false);
    }
  }, [stage, existingDemographics]);

  // ============================================
  // 1. FETCH SURVEY DATA
  // ============================================
  useEffect(() => {
    async function fetchSurvey() {
      try {
        const response = await fetch(
          `/api/public/surveys?surveyId=${campaign.surveyId}`
        );
        if (!response.ok) throw new Error('Failed to fetch survey');

        const surveyData = await response.json();
        setSurvey(surveyData);

        // Load existing survey responses into state
        const responseMap: Record<string, number | string> = {};
        existingResponses.forEach((r) => {
          if (r.value !== null) responseMap[r.questionId] = r.value;
          else if (r.textValue !== null) responseMap[r.questionId] = r.textValue;
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

  // All survey questions from all sections.
  // Demographics are handled separately with hardcoded questions above —
  // do NOT filter sections here.
  const allQuestions = useMemo(() => {
    if (!survey) return [];
    return survey.sections.flatMap((section) =>
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
  const progressPercentage = Math.round(
    ((currentQuestionIndex + 1) / totalQuestions) * 100
  );

  // ============================================
  // 2. AUTO-SAVE SURVEY RESPONSE TO SERVER
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
                questionId,
                questionNumber,
                ...(typeof value === 'number' ? { value } : { textValue: value }),
              },
            ],
          }),
        });
        if (!response.ok) throw new Error('Failed to save response');
      } catch (error) {
        console.error('Error saving response:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [sessionToken]
  );

  // ============================================
  // 3. AUTO-SAVE SURVEY PROGRESS TO LOCALSTORAGE
  // ============================================
  useEffect(() => {
    if (stage === 'survey' && survey) {
      localStorage.setItem(
        `anonymous-survey-progress-${sessionToken}`,
        JSON.stringify({
          surveyId: survey._id,
          currentQuestionIndex,
          answers,
          timestamp: Date.now(),
        })
      );
    }
  }, [answers, currentQuestionIndex, stage, survey, sessionToken]);

  // ============================================
  // 4. RESTORE SURVEY PROGRESS ON MOUNT
  // Demographics must already be complete before we restore a question index.
  // ============================================
  useEffect(() => {
    if (!existingDemographics) return;
    const saved = localStorage.getItem(`anonymous-survey-progress-${sessionToken}`);
    if (!saved) return;
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
  }, [sessionToken, existingDemographics]);

  // ============================================
  // 5. COMPLETE DEMOGRAPHICS — save JSON to server, advance to survey
  // ============================================
  const completeDemographics = useCallback(async () => {
    try {
      setIsDemoCompleting(true);
      const response = await fetch('/api/anonymous/responses/demographics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, demographics: demoAnswers }),
      });
      if (!response.ok) throw new Error('Failed to save demographics');
      setStage('survey');
    } catch (error) {
      console.error('Error completing demographics:', error);
      alert('Failed to save your demographics. Please try again.');
    } finally {
      setIsDemoCompleting(false);
    }
  }, [sessionToken, demoAnswers]);

  // ============================================
  // 6. DEMOGRAPHICS NEXT / ADVANCE
  // ============================================
  const handleDemographicsNext = useCallback(async () => {
    if (isDemoAdvancing || isDemoCompleting) return;
    const isLast = currentDemoIndex === totalDemoQuestions - 1;
    if (isLast) {
      await completeDemographics();
    } else {
      setCurrentDemoIndex((prev) => prev + 1);
    }
  }, [isDemoAdvancing, isDemoCompleting, currentDemoIndex, totalDemoQuestions, completeDemographics]);

  // ============================================
  // 7. DEMOGRAPHICS CHANGE HANDLER
  // ============================================
  const handleDemographicsChange = useCallback(
    (questionId: string, value: string) => {
      if (isDemoAdvancing || isDemoCompleting) return;
      setDemoAnswers((prev) => ({ ...prev, [questionId]: value }));
      if (currentDemoQuestion?.autoAdvance) {
        setIsDemoAdvancing(true);
        if (demoAdvanceTimeoutRef.current) clearTimeout(demoAdvanceTimeoutRef.current);
        demoAdvanceTimeoutRef.current = setTimeout(() => {
          setIsDemoAdvancing(false);
          void handleDemographicsNext();
        }, AUTO_ADVANCE_DELAY);
      }
    },
    [isDemoAdvancing, isDemoCompleting, currentDemoQuestion, handleDemographicsNext]
  );

  // ============================================
  // 8. DEMOGRAPHICS BACK
  // ============================================
  const handleDemographicsBack = useCallback(() => {
    if (currentDemoIndex > 0 && !isDemoAdvancing) {
      if (demoAdvanceTimeoutRef.current) {
        clearTimeout(demoAdvanceTimeoutRef.current);
        setIsDemoAdvancing(false);
      }
      setCurrentDemoIndex((prev) => prev - 1);
    }
  }, [currentDemoIndex, isDemoAdvancing]);

  // ============================================
  // 9. HANDLE SURVEY ANSWER WITH AUTO-ADVANCE
  // ============================================
  const handleAnswer = useCallback(
    (questionId: string, value: number | string) => {
      if (isAdvancing) return;
      const question = allQuestions.find((q) => q._id === questionId);
      if (!question) return;

      setAnswers((prev) => ({ ...prev, [questionId]: value }));
      setJustAnswered(true);

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        void saveToServer(questionId, question.number, value);
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
    [isAdvancing, isLastQuestion, saveToServer, allQuestions]
  );

  // ============================================
  // 10. SURVEY NAVIGATION
  // ============================================
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

  // ============================================
  // 11. SUBMIT SURVEY
  // ============================================
  const handleSubmit = async () => {
    try {
      setIsSaving(true);

      // Flush any pending debounced save so the last answer is persisted
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
        // Save the current question's answer if it exists
        const q = allQuestions[currentQuestionIndex];
        const pendingValue = q ? answers[q._id] : undefined;
        if (q && pendingValue !== undefined) {
          await saveToServer(q._id, q.number, pendingValue);
        }
      }

      const response = await fetch('/api/anonymous/responses/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, demographics: demoAnswers }),
      });
      if (!response.ok) throw new Error('Failed to submit survey');
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
  // 12. KEYBOARD NAVIGATION
  // ============================================
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (stage === 'demographics') handleDemographicsBack();
        else if (stage === 'survey') handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [stage, handleBack, handleDemographicsBack]);

  // ============================================
  // 13. CLEANUP TIMEOUTS ON UNMOUNT
  // ============================================
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
      if (demoAdvanceTimeoutRef.current) clearTimeout(demoAdvanceTimeoutRef.current);
    };
  }, []);

  // ── Loading ───────────────────────────────────────────────────────────────
  if ((loading || !survey) && stage !== 'demographics') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-600" />
          <p className="text-gray-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  // ── Demographics stage ────────────────────────────────────────────────────
  if (stage === 'demographics') {
    if (demoLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-600" />
            <p className="text-gray-600">Loading demographics...</p>
          </div>
        </div>
      );
    }

    // Safety guard — index is always in bounds but TypeScript needs the check
    if (!currentDemoQuestion) return null;

    const currentDemoAnswer = demoAnswers[currentDemoQuestion._id];
    const isAutoAdvanceField = currentDemoQuestion.autoAdvance;
    const canAdvance = Boolean(currentDemoAnswer);
    const isLastDemo = currentDemoIndex === totalDemoQuestions - 1;

    return (
      <div className="min-h-screen bg-white px-4 py-12">
        <div className="mx-auto max-w-2xl">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <Image
              src="/header-logo.png"
              alt="Logo"
              width={260}
              height={87}
              priority
              className="h-auto w-auto"
            />
          </div>

          {/* Anonymity badge */}
          <div className="mb-8 flex items-center justify-center gap-2 rounded-full bg-green-50 px-5 py-2.5 text-sm font-medium text-green-700 shadow-sm">
            <Shield className="h-4 w-4" />
            Anonymous Survey — Demographics
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
                    inputType={currentDemoQuestion.inputType}
                    options={currentDemoQuestion.options}
                    allowOther={currentDemoQuestion.allowOther}
                    placeholder={currentDemoQuestion.placeholder}
                    value={currentDemoAnswer ?? ''}
                    onChange={handleDemographicsChange}
                    disabled={isDemoAdvancing || isDemoCompleting}
                  />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleDemographicsBack}
              disabled={currentDemoIndex === 0 || isDemoAdvancing}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

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
                  <>
                    Continue to Survey
                    <ChevronRight className="h-4 w-4" />
                  </>
                ) : (
                  'Next'
                )}
              </motion.button>
            )}
          </div>

          {isAutoAdvanceField && !currentDemoAnswer && (
            <div className="mt-6 text-center text-sm text-gray-400">
              Select an option to automatically continue
            </div>
          )}

          <div className="mt-4 text-center text-xs text-gray-300">
            Use ← arrow key to go back
          </div>
        </div>
      </div>
    );
  }

  // ── Completed stage ───────────────────────────────────────────────────────
  if (stage === 'completed') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <ConfettiEffect />
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <motion.div
            className="mb-6 flex justify-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
              <motion.svg
                className="h-12 w-12 text-green-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <motion.path
                  d="M5 13l4 4L19 7"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
                />
              </motion.svg>
            </div>
          </motion.div>

          <motion.h1
            className="mb-4 text-2xl font-bold text-gray-900"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.45 }}
          >
            Thank You!
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <p className="mb-4 text-gray-700">
              Your anonymous responses have been recorded.
            </p>
            <div className="mb-4 flex items-center justify-center gap-2 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
              <Shield className="h-4 w-4 shrink-0" />
              Your identity is fully protected.
            </div>
            <p className="text-sm text-gray-500">
              You may now close this window. Your feedback is valuable and will
              help improve our organization.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Survey stage ──────────────────────────────────────────────────────────
  if (loading || !survey || !currentQuestion) return null;

  const renderQuestionInput = () => {
    const currentAnswer = answers[currentQuestion._id];

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

  return (
    <div className="min-h-screen bg-white px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <Image
            src="/header-logo.png"
            alt="Logo"
            width={180}
            height={60}
            priority
            className="h-auto w-auto"
          />
        </div>

        {/* Anonymity badge */}
        <div className="mb-8 flex items-center justify-center gap-2 rounded-full bg-green-50 px-5 py-2.5 text-sm font-medium text-green-700 shadow-sm">
          <Shield className="h-4 w-4" />
          Anonymous Survey
        </div>

        {/* Progress Bar */}
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

        {/* Save Indicator */}
        {isSaving && (
          <div className="mb-6 flex items-center justify-center gap-2 text-sm text-gray-500">
            <Save className="h-4 w-4 animate-pulse" />
            <span>Saving</span>
          </div>
        )}

        {/* Answered Indicator */}
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

        {!isLastQuestion && !answers[currentQuestion._id] && (
          <div className="mt-6 text-center text-sm text-gray-400">
            Select an answer to automatically continue
          </div>
        )}

        <div className="mt-4 text-center text-xs text-gray-300">
          Use ← arrow key to go back
        </div>
      </div>
    </div>
  );
}
