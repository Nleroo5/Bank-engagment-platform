'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  description: string | null;
  colorCode: string | null;
}

interface Question {
  id?: string;
  questionNumber: number;
  text: string;
  questionType: string;
  isRequired: boolean;
  isReversed: boolean;
  categories: { category: Category; categoryId: string }[];
}

interface QuestionFormProps {
  surveyId: string;
  categories: Category[];
  question?: Question;
  defaultQuestionNumber?: number;
}

export function QuestionForm({
  surveyId,
  categories,
  question,
  defaultQuestionNumber = 1,
}: QuestionFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    text: question?.text || '',
    questionType: question?.questionType || 'likert5',
    questionNumber: question?.questionNumber || defaultQuestionNumber,
    isRequired: question?.isRequired ?? true,
    isReversed: question?.isReversed ?? false,
    categoryIds: question?.categories.map((c) => c.categoryId) || [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = question?.id
        ? `/api/surveys/${surveyId}/questions/${question.id}`
        : `/api/surveys/${surveyId}/questions`;
      const method = question?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to save question');
        return;
      }

      router.push(`/admin/surveys/${surveyId}/edit`);
      router.refresh();
    } catch (error) {
      console.error('Failed to save question:', error);
      alert('Failed to save question');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter((id) => id !== categoryId)
        : [...prev.categoryIds, categoryId],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Question Details Card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Question Details
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Question Number */}
          <div>
            <label
              htmlFor="questionNumber"
              className="block text-sm font-medium text-gray-700"
            >
              Question Number *
            </label>
            <input
              type="number"
              id="questionNumber"
              required
              min="1"
              value={formData.questionNumber}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  questionNumber: parseInt(e.target.value),
                })
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Question Type */}
          <div>
            <label
              htmlFor="questionType"
              className="block text-sm font-medium text-gray-700"
            >
              Question Type *
            </label>
            <select
              id="questionType"
              required
              value={formData.questionType}
              onChange={(e) =>
                setFormData({ ...formData, questionType: e.target.value })
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="likert3">Likert 3-Point</option>
              <option value="likert5">Likert 5-Point</option>
              <option value="text">Text Input</option>
              <option value="select">Single Choice</option>
              <option value="multiselect">Multiple Choice</option>
            </select>
          </div>

          {/* Flags */}
          <div className="flex flex-col gap-3 pt-7">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isRequired}
                onChange={(e) =>
                  setFormData({ ...formData, isRequired: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Required</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isReversed}
                onChange={(e) =>
                  setFormData({ ...formData, isReversed: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Reverse Scoring</span>
            </label>
          </div>

          {/* Question Text */}
          <div className="md:col-span-3">
            <label
              htmlFor="text"
              className="block text-sm font-medium text-gray-700"
            >
              Question Text *
            </label>
            <textarea
              id="text"
              required
              rows={3}
              value={formData.text}
              onChange={(e) =>
                setFormData({ ...formData, text: e.target.value })
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Enter the question text that respondents will see..."
            />
          </div>
        </div>
      </div>

      {/* Categories Card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Categories</h2>
        <p className="mb-4 text-sm text-gray-600">
          Select one or more categories that this question belongs to for
          scoring purposes.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const isSelected = formData.categoryIds.includes(category.id);
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategoryToggle(category.id)}
                className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {category.colorCode && (
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: category.colorCode }}
                      />
                    )}
                    <p className="text-sm font-medium text-gray-900">
                      {category.name}
                    </p>
                  </div>
                  {category.description && (
                    <p className="mt-1 text-xs text-gray-500">
                      {category.description}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {formData.categoryIds.length === 0 && (
          <p className="mt-4 text-sm text-yellow-600">
            ⚠️ Warning: This question will not be included in category scoring
            if no categories are selected.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Link
          href={`/admin/surveys/${surveyId}/edit`}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Survey
        </Link>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving
            ? 'Saving...'
            : question?.id
              ? 'Save Changes'
              : 'Create Question'}
        </button>
      </div>
    </form>
  );
}
