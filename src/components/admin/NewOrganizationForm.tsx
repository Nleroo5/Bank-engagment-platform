'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseAndValidateEmails } from '@/lib/utils/emailParser';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const SIZE_RANGES = [
  '<$100M',
  '$100M-$250M',
  '$250M-$500M',
  '$500M-$750M',
  '$750M-$1B',
  '$1B-$2B',
  '$2B-$5B',
  '$5B-$10B',
  '$10B-$15B',
  '$15B-$20B',
  '>$20B',
];

export function NewOrganizationForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [emailValidation, setEmailValidation] = useState<{
    valid: string[];
    invalid: string[];
    duplicatesRemoved: number;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    sizeRange: '',
    locationCountry: 'United States',
    locationState: '',
    locationMetro: '',
    locationCity: '',
  });

  // Validate emails on input change (debounced by user typing)
  const handleEmailInputChange = (value: string) => {
    setEmailInput(value);

    if (value.trim() === '') {
      setEmailValidation(null);
      return;
    }

    // Parse and validate in real-time
    const validation = parseAndValidateEmails(value);
    setEmailValidation(validation);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate emails before submission
    if (emailInput.trim()) {
      const validation = parseAndValidateEmails(emailInput);

      if (validation.invalid.length > 0) {
        setError(
          `Please fix ${validation.invalid.length} invalid email(s) before submitting.`
        );
        return;
      }

      if (validation.valid.length === 0) {
        setError('No valid emails found. Please add at least one email.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        emails: emailValidation?.valid || [],
      };

      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create organization');
      }

      const data = await response.json();

      // Show success message if there were duplicates
      if (data.duplicates && data.duplicates.length > 0) {
        alert(
          `Organization created successfully!\n\nNote: ${data.duplicates.length} email(s) were skipped because they already exist:\n${data.duplicates.join('\n')}`
        );
      }

      router.push(`/admin/organizations/${data.organization.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="ml-3 text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Organization Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Organization Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="e.g., First National Bank"
        />
      </div>

      {/* Size Range */}
      <div>
        <label
          htmlFor="sizeRange"
          className="block text-sm font-medium text-gray-700"
        >
          Bank Size (Assets)
        </label>
        <select
          id="sizeRange"
          value={formData.sizeRange}
          onChange={(e) =>
            setFormData({ ...formData, sizeRange: e.target.value })
          }
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Select size range</option>
          {SIZE_RANGES.map((range) => (
            <option key={range} value={range}>
              {range}
            </option>
          ))}
        </select>
      </div>

      {/* Location Fields */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label
            htmlFor="locationState"
            className="block text-sm font-medium text-gray-700"
          >
            State
          </label>
          <input
            type="text"
            id="locationState"
            value={formData.locationState}
            onChange={(e) =>
              setFormData({ ...formData, locationState: e.target.value })
            }
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="e.g., California"
          />
        </div>

        <div>
          <label
            htmlFor="locationCity"
            className="block text-sm font-medium text-gray-700"
          >
            City
          </label>
          <input
            type="text"
            id="locationCity"
            value={formData.locationCity}
            onChange={(e) =>
              setFormData({ ...formData, locationCity: e.target.value })
            }
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="e.g., San Francisco"
          />
        </div>
      </div>

      {/* Email List */}
      <div>
        <label
          htmlFor="emails"
          className="block text-sm font-medium text-gray-700"
        >
          User Emails (Optional)
        </label>
        <textarea
          id="emails"
          rows={6}
          value={emailInput}
          onChange={(e) => handleEmailInputChange(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="Enter emails separated by commas or new lines:&#10;user1@bank.com, user2@bank.com&#10;user3@bank.com"
        />
        <div className="mt-2 space-y-2">
          <div className="flex items-start gap-2 text-sm text-gray-500">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              Separate emails with commas, newlines, or spaces. Duplicates will
              be automatically removed.
            </p>
          </div>

          {/* Email Validation Feedback */}
          {emailValidation && (
            <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
              {emailValidation.valid.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {emailValidation.valid.length} valid email(s) will be added
                  </span>
                </div>
              )}

              {emailValidation.invalid.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span>
                      {emailValidation.invalid.length} invalid email(s):
                    </span>
                  </div>
                  <ul className="ml-6 list-disc text-xs text-red-600">
                    {emailValidation.invalid.slice(0, 5).map((email) => (
                      <li key={email}>{email}</li>
                    ))}
                    {emailValidation.invalid.length > 5 && (
                      <li>...and {emailValidation.invalid.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              {emailValidation.duplicatesRemoved > 0 && (
                <div className="text-sm text-gray-600">
                  <Info className="mr-1 inline h-4 w-4" />
                  {emailValidation.duplicatesRemoved} duplicate(s) removed
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-6">
        <button
          type="button"
          onClick={() => router.push('/admin/organizations')}
          disabled={isSubmitting}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || (emailValidation?.invalid.length ?? 0) > 0}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Organization'}
        </button>
      </div>
    </form>
  );
}
