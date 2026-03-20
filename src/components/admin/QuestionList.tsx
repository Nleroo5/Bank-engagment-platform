'use client';

import { ArrowUp, ArrowDown, Edit, Trash2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Category {
  id: string;
  name: string;
  colorCode: string | null;
}

interface DemographicsConfig {
  inputType?: 'text' | 'dropdown' | 'radio';
  demographicKey?: string;
  options?: string[];
  allowOther?: boolean;
  placeholder?: string;
  autoAdvance?: boolean;
}

interface Question {
  id?: string;
  questionNumber: number;
  text: string;
  questionType: string;
  isRequired: boolean;
  isReversed: boolean;
  sortOrder: number;
  parentQuestionId?: string | null;
  subQuestionLetter?: string | null;
  categories: { category?: Category; categoryId: string }[];
  config?: DemographicsConfig | null;
}

interface QuestionListProps {
  questions: Question[];
  categories: Category[];
  surveyId: string;
}

export function QuestionList({
  questions: initialQuestions,
  categories,
  surveyId,
}: QuestionListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [localQuestions, setLocalQuestions] = useState(initialQuestions);

  // Sync with server data when props change (e.g., after delete refresh)
  useEffect(() => {
    setLocalQuestions(initialQuestions);
  }, [initialQuestions]);

  const handleDelete = async (questionId: string) => {
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

      // Optimistically remove from local state
      setLocalQuestions((prev) =>
        prev.filter((q) => q.id !== questionId && q.parentQuestionId !== questionId)
      );
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
    direction: 'up' | 'down',
    isSubQuestion: boolean
  ) => {
    // Optimistically swap in local state first
    setLocalQuestions((prev) => {
      const updated = [...prev];

      if (isSubQuestion) {
        const question = updated.find((q) => q.id === questionId);
        if (!question?.parentQuestionId) return prev;
        const siblings = updated.filter((q) => q.parentQuestionId === question.parentQuestionId);
        const siblingIndex = siblings.findIndex((q) => q.id === questionId);
        const swapIndex = direction === 'up' ? siblingIndex - 1 : siblingIndex + 1;
        if (swapIndex < 0 || swapIndex >= siblings.length) return prev;
        const swapQuestion = siblings[swapIndex];
        if (!swapQuestion) return prev;

        // Swap subQuestionLetter
        const currentIdx = updated.findIndex((q) => q.id === questionId);
        const swapIdx = updated.findIndex((q) => q.id === swapQuestion.id);
        const tempLetter = updated[currentIdx].subQuestionLetter;
        updated[currentIdx] = { ...updated[currentIdx], subQuestionLetter: updated[swapIdx].subQuestionLetter };
        updated[swapIdx] = { ...updated[swapIdx], subQuestionLetter: tempLetter };
        // Re-sort by questionNumber then subQuestionLetter
        updated.sort((a, b) => {
          if (a.questionNumber !== b.questionNumber) return a.questionNumber - b.questionNumber;
          return (a.subQuestionLetter || '').localeCompare(b.subQuestionLetter || '');
        });
      } else {
        const parents = updated.filter((q) => !q.parentQuestionId);
        const parentIndex = parents.findIndex((q) => q.id === questionId);
        const swapIndex = direction === 'up' ? parentIndex - 1 : parentIndex + 1;
        if (swapIndex < 0 || swapIndex >= parents.length) return prev;
        const swapQuestion = parents[swapIndex];
        if (!swapQuestion) return prev;

        // Swap sortOrder
        const currentIdx = updated.findIndex((q) => q.id === questionId);
        const swapIdx = updated.findIndex((q) => q.id === swapQuestion.id);
        const tempSort = updated[currentIdx].sortOrder;
        updated[currentIdx] = { ...updated[currentIdx], sortOrder: updated[swapIdx].sortOrder };
        updated[swapIdx] = { ...updated[swapIdx], sortOrder: tempSort };
        // Re-sort by sortOrder
        updated.sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return (a.subQuestionLetter || '').localeCompare(b.subQuestionLetter || '');
        });
      }

      return updated;
    });

    // Then persist to server
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
        // Revert on failure
        setLocalQuestions(initialQuestions);
        alert('Failed to reorder question');
      }
    } catch (error) {
      console.error('Failed to reorder question:', error);
      setLocalQuestions(initialQuestions);
      alert('Failed to reorder question');
    }
  };

  // Separate parent/standalone questions from sub-questions
  const parentQuestions = localQuestions.filter((q) => !q.parentQuestionId);
  const subQuestionMap = new Map<string, Question[]>();
  for (const q of localQuestions) {
    if (q.parentQuestionId) {
      const subs = subQuestionMap.get(q.parentQuestionId) || [];
      subs.push(q);
      subQuestionMap.set(q.parentQuestionId, subs);
    }
  }

  const renderQuestionRow = (
    question: Question,
    index: number,
    siblings: Question[],
    isSubQuestion: boolean
  ) => {
    const questionCategories = question.categories
      .map((qc) => {
        const category =
          qc.category || categories.find((c) => c.id === qc.categoryId);
        return category;
      })
      .filter(Boolean) as Category[];

    const displayNumber = isSubQuestion && question.subQuestionLetter
      ? `${question.questionNumber}.${question.subQuestionLetter}`
      : `${question.questionNumber}`;

    const subCount = question.id ? (subQuestionMap.get(question.id)?.length || 0) : 0;

    return (
      <div
        key={question.id || index}
        className={`flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50 ${isSubQuestion ? 'ml-10 border-l-4 border-l-blue-200' : ''}`}
      >
        {/* Question Number */}
        <div className="flex-shrink-0">
          <div className={`flex h-8 items-center justify-center rounded-full px-3 text-sm font-semibold ${isSubQuestion ? 'bg-blue-50 text-blue-600' : 'bg-primary-100 text-primary-700'}`}>
            {displayNumber}
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
          {/* Demographics config preview */}
          {question.config?.inputType && (
            <div className="mt-2 rounded-md border border-gray-100 bg-gray-50 p-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-medium">
                  {question.config.inputType === 'text'
                    ? 'Text Input'
                    : question.config.inputType === 'dropdown'
                      ? 'Dropdown'
                      : 'Radio Buttons'}
                </span>
                {question.config.demographicKey && (
                  <span className="text-gray-400">
                    · key: {question.config.demographicKey}
                  </span>
                )}
                {question.config.allowOther && (
                  <span className="text-gray-400">· has &quot;Other&quot;</span>
                )}
              </div>
              {question.config.options &&
                question.config.options.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {question.config.options.slice(0, 6).map((opt) => (
                      <span
                        key={opt}
                        className="inline-block rounded bg-white px-1.5 py-0.5 text-xs text-gray-600 ring-1 ring-gray-200"
                      >
                        {opt}
                      </span>
                    ))}
                    {question.config.options.length > 6 && (
                      <span className="inline-block px-1.5 py-0.5 text-xs text-gray-400">
                        +{question.config.options.length - 6} more
                      </span>
                    )}
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {/* Reorder buttons */}
          <div className="flex flex-col gap-1">
            <button
              onClick={() =>
                question.id && handleReorder(question.id, 'up', isSubQuestion)
              }
              disabled={index === 0}
              className="rounded p-1 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-30"
              title="Move up"
            >
              <ArrowUp className="h-4 w-4 text-gray-600" />
            </button>
            <button
              onClick={() =>
                question.id && handleReorder(question.id, 'down', isSubQuestion)
              }
              disabled={index === siblings.length - 1}
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
            onClick={() => {
              if (!question.id) return;
              const msg = subCount > 0
                ? `This will also delete ${subCount} sub-question${subCount > 1 ? 's' : ''}. Continue?`
                : 'Are you sure you want to delete this question?';
              if (confirm(msg)) handleDelete(question.id);
            }}
            disabled={deletingId === question.id}
            className="rounded p-2 hover:bg-red-100 disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {parentQuestions.map((question, index) => {
        const subs = question.id ? (subQuestionMap.get(question.id) || []) : [];
        return (
          <div key={question.id || index}>
            {renderQuestionRow(question, index, parentQuestions, false)}
            {/* Sub-questions */}
            {subs.map((sub, subIndex) =>
              renderQuestionRow(sub, subIndex, subs, true)
            )}
            {/* Add sub-question button */}
            {question.id && (
              <div className="ml-10 mt-2 mb-1">
                <Link
                  href={`/admin/surveys/${surveyId}/questions/new?parentId=${question.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-500 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-600"
                >
                  <Plus className="h-4 w-4" />
                  Add sub-question
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
