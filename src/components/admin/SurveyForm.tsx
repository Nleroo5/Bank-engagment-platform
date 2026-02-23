'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import Link from 'next/link';
import { QuestionList } from './QuestionList';

interface Scale {
  id: string;
  name: string;
  scaleType: string;
  min: number;
  max: number;
  labels: Record<string, string>;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  weight: number;
  colorCode: string | null;
}

interface Question {
  id?: string;
  questionNumber: number;
  text: string;
  questionType: string;
  isRequired: boolean;
  isReversed: boolean;
  sortOrder: number;
  categories: { categoryId: string }[];
}

interface Survey {
  id?: string;
  title: string;
  description: string | null;
  surveyType: string;
  surveyNumber: string | null;
  status: string;
  scaleId: string | null;
  questions?: Question[];
}

interface SurveyFormProps {
  scales: Scale[];
  categories: Category[];
  survey?: Survey;
}

// Maps each survey program to its scale and a human-readable description.
// The scale is derived automatically — admins pick the program, not the scale.
const SURVEY_TYPE_OPTIONS = [
  {
    value: 'likert5',
    label: 'Leadership / Operational Team Effectiveness',
    description: 'Survey 4 (LTE) or Survey 5 (OTE) · 5-point scale: Strongly Disagree → Strongly Agree',
    scaleType: 'likert5',
  },
  {
    value: 'managerial_assessment',
    label: 'Managerial Assessment',
    description: 'Survey 6 · 3-point scale: Rarely / Sometimes / Frequently · Includes reverse-scored items',
    scaleType: 'likert3',
  },
  {
    value: 'associate_180',
    label: 'Associate 180 Assessment',
    description: 'Survey 7 · 3-point scale: Rarely / Sometimes / Frequently · Anonymous · Requires 5+ respondents',
    scaleType: 'likert3',
  },
  {
    value: 'demographics',
    label: 'Demographics',
    description: 'Survey 1 · Demographic collection form · No rating scale',
    scaleType: null,
  },
] as const;

// Fallback entry shown when editing a survey with a legacy surveyType not in the list above.
const LEGACY_SURVEY_TYPE_OPTION = {
  value: 'likert3',
  label: '3-Point Survey (legacy)',
  description: '3-point scale · Rarely / Sometimes / Frequently',
  scaleType: 'likert3',
};

type SurveyTypeOption = (typeof SURVEY_TYPE_OPTIONS)[number] | typeof LEGACY_SURVEY_TYPE_OPTION;

function getSurveyTypeOption(value: string): SurveyTypeOption | undefined {
  return (
    (SURVEY_TYPE_OPTIONS as readonly SurveyTypeOption[]).find((o) => o.value === value) ??
    (value === LEGACY_SURVEY_TYPE_OPTION.value ? LEGACY_SURVEY_TYPE_OPTION : undefined)
  );
}

function formatScaleLabels(labels: Record<string, string>, min: number, max: number): string {
  const entries: string[] = [];
  for (let i = min; i <= max; i++) {
    const label = labels[i.toString()];
    if (label) entries.push(label);
  }
  return entries.join(' → ');
}

export function SurveyForm({ scales, categories, survey }: SurveyFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const getInitialScaleId = (): string => {
    if (survey?.scaleId) return survey.scaleId;
    // Default: match the first option's scaleType
    const defaultScaleType = SURVEY_TYPE_OPTIONS[0].scaleType;
    return scales.find((s) => s.scaleType === defaultScaleType)?.id ?? scales[0]?.id ?? '';
  };

  const [formData, setFormData] = useState({
    title: survey?.title ?? '',
    description: survey?.description ?? '',
    surveyType: survey?.surveyType ?? 'likert5',
    surveyNumber: survey?.surveyNumber ?? '',
    status: survey?.status ?? 'DRAFT',
    scaleId: getInitialScaleId(),
  });

  const questions = survey?.questions ?? [];

  const selectedTypeOption = getSurveyTypeOption(formData.surveyType);
  const selectedScale = scales.find((s) => s.id === formData.scaleId);

  const handleSurveyTypeChange = (newType: string) => {
    const typeOption = getSurveyTypeOption(newType);
    const matchingScale = typeOption?.scaleType
      ? scales.find((s) => s.scaleType === typeOption.scaleType)
      : null;
    setFormData({
      ...formData,
      surveyType: newType,
      scaleId: matchingScale?.id ?? '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = survey?.id ? `/api/surveys/${survey.id}` : '/api/surveys';
      const method = survey?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to save survey');
        return;
      }

      const savedSurvey = await response.json();

      if (questions.length > 0 && !survey?.id) {
        router.push(`/admin/surveys/${savedSurvey.id}/edit`);
      } else {
        router.push('/admin/surveys');
      }
    } catch (error) {
      console.error('Failed to save survey:', error);
      alert('Failed to save survey');
    } finally {
      setIsSaving(false);
    }
  };

  // All options shown in the dropdown — include legacy option only when editing a survey that uses it
  const typeOptionsToShow: SurveyTypeOption[] = [
    ...SURVEY_TYPE_OPTIONS,
    ...(survey?.surveyType === LEGACY_SURVEY_TYPE_OPTION.value ? [LEGACY_SURVEY_TYPE_OPTION] : []),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Survey Details Card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Survey Details</h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Title */}
          <div className="md:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Survey Title *
            </label>
            <input
              type="text"
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="e.g., Leadership Team Effectiveness"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Brief description of this survey"
            />
          </div>

          {/* Survey Type */}
          <div className="md:col-span-2">
            <label htmlFor="surveyType" className="block text-sm font-medium text-gray-700">
              Survey Program *
            </label>
            <select
              id="surveyType"
              required
              value={formData.surveyType}
              onChange={(e) => handleSurveyTypeChange(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {typeOptionsToShow.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {selectedTypeOption && (
              <p className="mt-1 text-xs text-gray-500">{selectedTypeOption.description}</p>
            )}
          </div>

          {/* Response Scale — read-only, derived from Survey Program */}
          <div>
            <p className="block text-sm font-medium text-gray-700">Response Scale</p>
            {selectedScale ? (
              <>
                <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  <span className="font-medium">{selectedScale.name}</span>
                  <span className="ml-2 text-gray-500">
                    ({selectedScale.min}–{selectedScale.max}
                    {Object.keys(selectedScale.labels).length > 0 &&
                      ` · ${formatScaleLabels(selectedScale.labels, selectedScale.min, selectedScale.max)}`}
                    )
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Automatically set by the selected survey program
                </p>
              </>
            ) : (
              <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400">
                No scale — demographics only
              </div>
            )}
          </div>

          {/* Survey Number */}
          <div>
            <label htmlFor="surveyNumber" className="block text-sm font-medium text-gray-700">
              Survey Number
            </label>
            <input
              type="text"
              id="surveyNumber"
              value={formData.surveyNumber}
              onChange={(e) => setFormData({ ...formData, surveyNumber: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="e.g., Survey 4, Survey 5"
            />
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Questions Section (only show when editing) */}
      {survey?.id && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Questions ({questions.length})
            </h2>
            <Link
              href={`/admin/surveys/${survey.id}/questions/new`}
              className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              Add Question
            </Link>
          </div>

          {questions.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p>No questions yet. Add your first question to get started.</p>
            </div>
          ) : (
            <QuestionList
              questions={questions}
              categories={categories}
              surveyId={survey.id}
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/surveys"
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Surveys
        </Link>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : survey?.id ? 'Save Changes' : 'Create Survey'}
        </button>
      </div>
    </form>
  );
}
