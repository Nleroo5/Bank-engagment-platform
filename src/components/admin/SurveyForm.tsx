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
  description?: string;
  surveyType: string;
  surveyNumber?: string;
  status: string;
  scaleId?: string;
  questions?: Question[];
}

interface SurveyFormProps {
  scales: Scale[];
  categories: Category[];
  survey?: Survey;
}

export function SurveyForm({ scales, categories, survey }: SurveyFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: survey?.title || '',
    description: survey?.description || '',
    surveyType: survey?.surveyType || 'likert5',
    surveyNumber: survey?.surveyNumber || '',
    status: survey?.status || 'DRAFT',
    scaleId: survey?.scaleId || scales[0]?.id || '',
  });
  const [questions, setQuestions] = useState<Question[]>(
    survey?.questions || []
  );

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

      // If we have questions, redirect to the edit page with questions tab
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Survey Details Card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Survey Details
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Title */}
          <div className="md:col-span-2">
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700"
            >
              Survey Title *
            </label>
            <input
              type="text"
              id="title"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="e.g., Leadership Team Effectiveness"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Brief description of this survey"
            />
          </div>

          {/* Survey Type */}
          <div>
            <label
              htmlFor="surveyType"
              className="block text-sm font-medium text-gray-700"
            >
              Survey Type *
            </label>
            <select
              id="surveyType"
              required
              value={formData.surveyType}
              onChange={(e) =>
                setFormData({ ...formData, surveyType: e.target.value })
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="likert3">Likert 3-Point</option>
              <option value="likert5">Likert 5-Point</option>
              <option value="associate_180">Associate 180</option>
              <option value="managerial_assessment">
                Managerial Assessment
              </option>
            </select>
          </div>

          {/* Survey Number */}
          <div>
            <label
              htmlFor="surveyNumber"
              className="block text-sm font-medium text-gray-700"
            >
              Survey Number
            </label>
            <input
              type="text"
              id="surveyNumber"
              value={formData.surveyNumber}
              onChange={(e) =>
                setFormData({ ...formData, surveyNumber: e.target.value })
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="e.g., Survey 4, Survey 5"
            />
          </div>

          {/* Scale */}
          <div>
            <label
              htmlFor="scaleId"
              className="block text-sm font-medium text-gray-700"
            >
              Scale
            </label>
            <select
              id="scaleId"
              value={formData.scaleId}
              onChange={(e) =>
                setFormData({ ...formData, scaleId: e.target.value })
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">No scale</option>
              {scales.map((scale) => (
                <option key={scale.id} value={scale.id}>
                  {scale.name} ({scale.min}-{scale.max})
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700"
            >
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
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
          {isSaving
            ? 'Saving...'
            : survey?.id
              ? 'Save Changes'
              : 'Create Survey'}
        </button>
      </div>
    </form>
  );
}
