'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

interface DeleteSurveyButtonProps {
  surveyId: string;
  surveyTitle: string;
  hasCampaigns: boolean;
}

export function DeleteSurveyButton({
  surveyId,
  surveyTitle,
  hasCampaigns,
}: DeleteSurveyButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/surveys/${surveyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to delete survey');
        return;
      }

      router.refresh();
      setShowConfirm(false);
    } catch (error) {
      console.error('Failed to delete survey:', error);
      alert('Failed to delete survey');
    } finally {
      setIsDeleting(false);
    }
  };

  if (hasCampaigns) {
    return (
      <button
        disabled
        className="inline-flex cursor-not-allowed items-center gap-1 text-gray-400"
        title="Cannot delete survey with active campaigns"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center gap-1 text-red-600 hover:text-red-900"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900">Delete Survey</h3>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete <strong>{surveyTitle}</strong>?
              This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
