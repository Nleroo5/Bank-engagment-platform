'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { SurveyCreatorWidget } from '@/components/admin/SurveyCreator';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function EditSurveyPage() {
  const router = useRouter();
  const params = useParams();
  const surveyId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [surveyJson, setSurveyJson] = useState<object>({});
  const [metadata, setMetadata] = useState({
    title: '',
    description: '',
    surveyType: 'likert5' as 'likert3' | 'likert5',
    surveyNumber: '',
    status: 'DRAFT' as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
    version: 1,
  });

  // Load existing survey data
  useEffect(() => {
    const loadSurvey = async () => {
      try {
        const response = await fetch(`/api/surveys/${surveyId}`);
        if (!response.ok) {
          throw new Error('Failed to load survey');
        }

        const survey = await response.json();
        setMetadata({
          title: survey.title,
          description: survey.description || '',
          surveyType: survey.surveyType,
          surveyNumber: survey.surveyNumber || '',
          status: survey.status,
          version: survey.version,
        });
        setSurveyJson(survey.surveyjsSchema);
      } catch (error) {
        console.error('Error loading survey:', error);
        alert('Failed to load survey');
        router.push('/admin/surveys');
      } finally {
        setIsLoading(false);
      }
    };

    if (surveyId) {
      loadSurvey();
    }
  }, [surveyId, router]);

  const handleSave = (json: object) => {
    setSurveyJson(json);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!metadata.title.trim()) {
      alert('Please enter a survey title');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/surveys/${surveyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: metadata.title,
          description: metadata.description,
          surveyType: metadata.surveyType,
          surveyNumber: metadata.surveyNumber,
          surveyjsSchema: surveyJson,
          status: metadata.status,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update survey');
      }

      const survey = await response.json();
      setMetadata((prev) => ({ ...prev, version: survey.version }));
      alert('Survey updated successfully!');
    } catch (error) {
      console.error('Error updating survey:', error);
      alert(
        error instanceof Error ? error.message : 'Failed to update survey'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="text-gray-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/surveys"
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Edit Survey
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {metadata.title} (v{metadata.version})
              </p>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Metadata Form */}
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-medium text-gray-900">
            Survey Metadata
          </h2>
          <form className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700"
              >
                Survey Title *
              </label>
              <input
                type="text"
                id="title"
                value={metadata.title}
                onChange={(e) =>
                  setMetadata({ ...metadata, title: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g., Leadership Team Effectiveness Survey"
                required
              />
            </div>

            <div className="col-span-2">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <textarea
                id="description"
                value={metadata.description}
                onChange={(e) =>
                  setMetadata({ ...metadata, description: e.target.value })
                }
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Describe the purpose of this survey..."
              />
            </div>

            <div>
              <label
                htmlFor="surveyType"
                className="block text-sm font-medium text-gray-700"
              >
                Survey Type *
              </label>
              <select
                id="surveyType"
                value={metadata.surveyType}
                onChange={(e) =>
                  setMetadata({
                    ...metadata,
                    surveyType: e.target.value as 'likert3' | 'likert5',
                  })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="likert5">5-Point Likert Scale</option>
                <option value="likert3">3-Point Likert Scale</option>
              </select>
            </div>

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
                value={metadata.surveyNumber}
                onChange={(e) =>
                  setMetadata({ ...metadata, surveyNumber: e.target.value })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g., Survey 4"
              />
            </div>

            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700"
              >
                Status
              </label>
              <select
                id="status"
                value={metadata.status}
                onChange={(e) =>
                  setMetadata({
                    ...metadata,
                    status: e.target.value as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
                  })
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Version
              </label>
              <div className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-500">
                v{metadata.version}
              </div>
            </div>
          </form>
        </div>

        {/* Survey Creator */}
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <SurveyCreatorWidget initialJson={surveyJson} onSave={handleSave} />
        </div>
      </div>
    </div>
  );
}
