'use client';

import { ArrowUp, ArrowDown, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Category {
  id: string;
  name: string;
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
  categories: { category?: Category; categoryId: string }[];
}

interface QuestionListProps {
  questions: Question[];
  categories: Category[];
  surveyId: string;
}

export function QuestionList({
  questions,
  categories,
  surveyId,
}: QuestionListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) {
      return;
    }

    setDeletingId(questionId);
    try {
      const response = await fetch(
        `/api/surveys/${surveyId}/questions/${questionId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        alert('Failed to delete question');
        return;
      }

      router.refresh();
    } catch (error) {
      console.error('Failed to delete question:', error);
      alert('Failed to delete question');
    } finally {
      setDeletingId(null);
    }
  };

  const handleReorder = async (
    questionId: string,
    direction: 'up' | 'down'
  ) => {
    try {
      const response = await fetch(
        `/api/surveys/${surveyId}/questions/${questionId}/reorder`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ direction }),
        }
      );

      if (!response.ok) {
        alert('Failed to reorder question');
        return;
      }

      router.refresh();
    } catch (error) {
      console.error('Failed to reorder question:', error);
      alert('Failed to reorder question');
    }
  };

  return (
    <div className="space-y-3">
      {questions.map((question, index) => {
        const questionCategories = question.categories
          .map((qc) => {
            const category =
              qc.category || categories.find((c) => c.id === qc.categoryId);
            return category;
          })
          .filter(Boolean) as Category[];

        return (
          <div
            key={question.id || index}
            className="flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50"
          >
            {/* Question Number */}
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                {question.questionNumber}
              </div>
            </div>

            {/* Question Content */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">
                {question.text}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                  {question.questionType}
                </span>
                {question.isReversed && (
                  <span className="inline-flex items-center rounded-md bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                    Reversed
                  </span>
                )}
                {question.isRequired && (
                  <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-1 text-xs text-blue-800">
                    Required
                  </span>
                )}
                {questionCategories.map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-flex items-center rounded-md px-2 py-1 text-xs"
                    style={{
                      backgroundColor: cat.colorCode
                        ? `${cat.colorCode}20`
                        : '#f3f4f6',
                      color: cat.colorCode || '#374151',
                    }}
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-shrink-0 items-center gap-2">
              {/* Reorder buttons */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() =>
                    question.id && handleReorder(question.id, 'up')
                  }
                  disabled={index === 0}
                  className="rounded p-1 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30"
                  title="Move up"
                >
                  <ArrowUp className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={() =>
                    question.id && handleReorder(question.id, 'down')
                  }
                  disabled={index === questions.length - 1}
                  className="rounded p-1 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30"
                  title="Move down"
                >
                  <ArrowDown className="h-4 w-4 text-gray-600" />
                </button>
              </div>

              {/* Edit */}
              <Link
                href={`/admin/surveys/${surveyId}/questions/${question.id}/edit`}
                className="rounded p-2 hover:bg-gray-200"
                title="Edit"
              >
                <Edit className="h-4 w-4 text-primary-600" />
              </Link>

              {/* Delete */}
              <button
                onClick={() => question.id && handleDelete(question.id)}
                disabled={deletingId === question.id}
                className="rounded p-2 hover:bg-red-100 disabled:opacity-50"
                title="Delete"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
