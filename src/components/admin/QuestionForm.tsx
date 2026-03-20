'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, GripVertical } from 'lucide-react';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  description: string | null;
  colorCode: string | null;
}

interface DemoConfig {
  fieldType: string;
  demographicKey: string;
  inputType: 'text' | 'dropdown' | 'radio';
  options: string[];
  allowOther: boolean;
  placeholder: string;
  autoAdvance: boolean;
}

interface Question {
  id?: string;
  questionNumber: number;
  text: string;
  questionType: string;
  isRequired: boolean;
  isReversed: boolean;
  weight?: number;
  categories: { category: Category; categoryId: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any;
}

interface ParentQuestion {
  id: string;
  questionNumber: number;
}

interface QuestionFormProps {
  surveyId: string;
  surveyType?: string;
  categories: Category[];
  question?: Question;
  defaultQuestionNumber?: number;
  parentQuestion?: ParentQuestion;
}

const DEFAULT_DEMO_CONFIG: DemoConfig = {
  fieldType: '',
  demographicKey: '',
  inputType: 'text',
  options: [],
  allowOther: false,
  placeholder: '',
  autoAdvance: false,
};

export function QuestionForm({
  surveyId,
  surveyType,
  categories,
  question,
  defaultQuestionNumber = 1,
  parentQuestion,
}: QuestionFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const isDemographics = surveyType === 'demographics';
  const isCustom = surveyType === 'custom' || isDemographics;

  const getDefaultQuestionType = () => {
    if (question?.questionType) return question.questionType;
    if (isCustom) return 'text';
    return 'likert5';
  };

  const [formData, setFormData] = useState({
    text: question?.text || '',
    questionType: getDefaultQuestionType(),
    questionNumber: parentQuestion?.questionNumber || question?.questionNumber || defaultQuestionNumber,
    isRequired: question?.isRequired ?? true,
    isReversed: question?.isReversed ?? false,
    weight: question?.weight ?? 1,
    categoryIds: question?.categories.map((c) => c.categoryId) || [],
  });
  const [demoConfig, setDemoConfig] = useState<DemoConfig>(() => {
    const cfg = question?.config;
    if (!cfg) return { ...DEFAULT_DEMO_CONFIG };
    return {
      fieldType: (cfg.fieldType as string) ?? '',
      demographicKey: (cfg.demographicKey as string) ?? '',
      inputType: (cfg.inputType as 'text' | 'dropdown' | 'radio') ?? 'text',
      options: Array.isArray(cfg.options) ? (cfg.options as string[]) : [],
      allowOther: Boolean(cfg.allowOther),
      placeholder: (cfg.placeholder as string) ?? '',
      autoAdvance: Boolean(cfg.autoAdvance),
    };
  });
  const [newOption, setNewOption] = useState('');
  const [customOptions, setCustomOptions] = useState<string[]>(() => {
    const cfg = question?.config;
    if (cfg && Array.isArray(cfg.options)) return cfg.options as string[];
    return [];
  });
  const [newCustomOption, setNewCustomOption] = useState('');

  // Whether the current custom question type needs answer options
  // Demographics surveys use the Demographics Configuration section instead
  const customNeedsOptions = isCustom && !isDemographics && ['select', 'multiselect', 'checkbox'].includes(formData.questionType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = question?.id
        ? `/api/surveys/${surveyId}/questions/${question.id}`
        : `/api/surveys/${surveyId}/questions`;
      const method = question?.id ? 'PUT' : 'POST';

      let payload;
      if (isDemographics) {
        payload = { ...formData, config: demoConfig };
      } else if (isCustom && customNeedsOptions) {
        payload = { ...formData, config: { options: customOptions } };
      } else {
        payload = { ...formData };
      }
      if (parentQuestion && !question?.id) {
        (payload as Record<string, unknown>).parentQuestionId = parentQuestion.id;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

        {parentQuestion && (
          <div className="mb-4 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Sub-question of Question {parentQuestion.questionNumber}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {/* Question Number */}
          {!parentQuestion && (
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
          )}

          {/* Weight */}
          <div>
            <label
              htmlFor="weight"
              className="block text-sm font-medium text-gray-700"
            >
              Weight
            </label>
            <input
              type="number"
              id="weight"
              min="0.01"
              step="0.01"
              value={formData.weight}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  weight: parseFloat(e.target.value) || 1,
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
              {isCustom ? 'Response Type *' : 'Question Type *'}
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
              {isCustom ? (
                <>
                  <option value="likert5">5-Point Likert Scale</option>
                  <option value="likert3">3-Point Likert Scale</option>
                  <option value="truefalse">True / False</option>
                  <option value="text">Text Field</option>
                  <option value="select">Dropdown (Single Choice)</option>
                  <option value="multiselect">Multiple Choice</option>
                  <option value="checkbox">Checkboxes</option>
                </>
              ) : (
                <>
                  <option value="likert3">Likert 3-Point</option>
                  <option value="likert5">Likert 5-Point</option>
                  <option value="text">Text Input</option>
                  <option value="select">Single Choice</option>
                  <option value="multiselect">Multiple Choice</option>
                </>
              )}
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
          <div className="md:col-span-4">
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

      {/* Demographics Configuration */}
      {isDemographics && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Demographics Configuration
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Demographic Key */}
            <div>
              <label
                htmlFor="demographicKey"
                className="block text-sm font-medium text-gray-700"
              >
                Demographic Key *
              </label>
              <input
                type="text"
                id="demographicKey"
                value={demoConfig.demographicKey}
                onChange={(e) =>
                  setDemoConfig({ ...demoConfig, demographicKey: e.target.value })
                }
                disabled={Boolean(question?.id)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="e.g., bankSize, division, gender"
              />
              {question?.id && (
                <p className="mt-1 text-xs text-gray-500">
                  Cannot be changed after creation (would break existing report data).
                </p>
              )}
            </div>

            {/* Field Type */}
            <div>
              <label
                htmlFor="fieldType"
                className="block text-sm font-medium text-gray-700"
              >
                Field Type
              </label>
              <input
                type="text"
                id="fieldType"
                value={demoConfig.fieldType}
                onChange={(e) =>
                  setDemoConfig({ ...demoConfig, fieldType: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g., bankSize, division"
              />
            </div>

            {/* Input Type */}
            <div>
              <label
                htmlFor="inputType"
                className="block text-sm font-medium text-gray-700"
              >
                Input Type *
              </label>
              <select
                id="inputType"
                value={demoConfig.inputType}
                onChange={(e) =>
                  setDemoConfig({
                    ...demoConfig,
                    inputType: e.target.value as 'text' | 'dropdown' | 'radio',
                  })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="text">Text Input</option>
                <option value="dropdown">Dropdown</option>
                <option value="radio">Radio Cards</option>
              </select>
            </div>

            {/* Placeholder */}
            <div>
              <label
                htmlFor="placeholder"
                className="block text-sm font-medium text-gray-700"
              >
                Placeholder Text
              </label>
              <input
                type="text"
                id="placeholder"
                value={demoConfig.placeholder}
                onChange={(e) =>
                  setDemoConfig({ ...demoConfig, placeholder: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Placeholder shown in the input field"
              />
            </div>

            {/* Flags */}
            <div className="flex flex-col gap-3 md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={demoConfig.allowOther}
                  onChange={(e) =>
                    setDemoConfig({ ...demoConfig, allowOther: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">
                  Allow &quot;Other&quot; option (adds a text input for custom answers)
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={demoConfig.autoAdvance}
                  onChange={(e) =>
                    setDemoConfig({ ...demoConfig, autoAdvance: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">
                  Auto-advance on selection (recommended for radio fields)
                </span>
              </label>
            </div>
          </div>

          {/* Options List Editor */}
          {(demoConfig.inputType === 'dropdown' || demoConfig.inputType === 'radio') && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700">
                Answer Options
              </label>
              <p className="mb-3 text-xs text-gray-500">
                Add the options that respondents can choose from.
              </p>

              <div className="space-y-2">
                {demoConfig.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 shrink-0 text-gray-400" />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const updated = [...demoConfig.options];
                        updated[index] = e.target.value;
                        setDemoConfig({ ...demoConfig, options: updated });
                      }}
                      className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = demoConfig.options.filter((_, i) => i !== index);
                        setDemoConfig({ ...demoConfig, options: updated });
                      }}
                      className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove option ${option}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newOption.trim()) {
                      e.preventDefault();
                      setDemoConfig({
                        ...demoConfig,
                        options: [...demoConfig.options, newOption.trim()],
                      });
                      setNewOption('');
                    }
                  }}
                  className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Type an option and press Enter or click Add"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newOption.trim()) {
                      setDemoConfig({
                        ...demoConfig,
                        options: [...demoConfig.options, newOption.trim()],
                      });
                      setNewOption('');
                    }
                  }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>

              {demoConfig.options.length === 0 && (
                <p className="mt-2 text-sm text-yellow-600">
                  No options added yet. Respondents will see an empty list.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Custom Survey: Answer Options */}
      {customNeedsOptions && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">Answer Options</h2>
          <p className="mb-4 text-sm text-gray-500">
            Define the options respondents can choose from.
          </p>

          <div className="space-y-2">
            {customOptions.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 shrink-0 text-gray-400" />
                <input
                  type="text"
                  value={option}
                  onChange={(e) => {
                    const updated = [...customOptions];
                    updated[index] = e.target.value;
                    setCustomOptions(updated);
                  }}
                  className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setCustomOptions(customOptions.filter((_, i) => i !== index))}
                  className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Remove option ${option}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              value={newCustomOption}
              onChange={(e) => setNewCustomOption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCustomOption.trim()) {
                  e.preventDefault();
                  setCustomOptions([...customOptions, newCustomOption.trim()]);
                  setNewCustomOption('');
                }
              }}
              className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Type an option and press Enter or click Add"
            />
            <button
              type="button"
              onClick={() => {
                if (newCustomOption.trim()) {
                  setCustomOptions([...customOptions, newCustomOption.trim()]);
                  setNewCustomOption('');
                }
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          {customOptions.length === 0 && (
            <p className="mt-2 text-sm text-yellow-600">
              No options added yet. Respondents will see an empty list.
            </p>
          )}
        </div>
      )}

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
