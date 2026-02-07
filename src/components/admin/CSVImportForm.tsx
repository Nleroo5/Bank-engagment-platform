'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Organization } from '@prisma/client';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface CSVImportFormProps {
  organizations: Organization[];
}

interface CSVRow {
  [key: string]: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export function CSVImportForm({ organizations }: CSVImportFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [defaultOrganization, setDefaultOrganization] = useState(
    organizations[0]?.id || ''
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requiredFields = [
    { key: 'email', label: 'Email' },
    { key: 'name', label: 'Name' },
  ];

  const optionalFields = [
    { key: 'division', label: 'Division' },
    { key: 'jobRole', label: 'Job Role' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setError(null);
    parseCSV(selectedFile);
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length === 0) {
        setError('CSV file is empty');
        return;
      }

      // Parse headers (we know lines is not empty from the check above)
      const headerLine = lines[0] || '';
      if (!headerLine) {
        setError('CSV file has no headers');
        return;
      }
      const parsedHeaders = headerLine.split(',').map((h) => h.trim());
      setHeaders(parsedHeaders);

      // Initialize column mapping with exact matches
      const initialMapping: Record<string, string> = {};
      parsedHeaders.forEach((header) => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('email')) initialMapping.email = header;
        if (lowerHeader.includes('name')) initialMapping.name = header;
        if (lowerHeader.includes('division')) initialMapping.division = header;
        if (lowerHeader.includes('job') && lowerHeader.includes('role'))
          initialMapping.jobRole = header;
      });
      setColumnMapping(initialMapping);

      // Parse data rows
      const rows: CSVRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        const values = line.split(',').map((v) => v.trim());
        const row: CSVRow = {};
        parsedHeaders.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        rows.push(row);
      }

      setCSVData(rows);
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    // Validate required mappings
    if (!columnMapping.email || !columnMapping.name) {
      setError('Please map required fields: Email and Name');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Transform CSV data to user objects
      // We've already validated these mappings exist
      const emailCol = columnMapping.email;
      const nameCol = columnMapping.name;
      const divisionCol = columnMapping.division;
      const jobRoleCol = columnMapping.jobRole;

      const users = csvData.map((row) => ({
        email: row[emailCol] || '',
        name: row[nameCol] || '',
        division: divisionCol ? row[divisionCol] : undefined,
        jobRole: jobRoleCol ? row[jobRoleCol] : undefined,
        organizationId: defaultOrganization,
        role: 'RESPONDENT' as const,
      }));

      const response = await fetch('/api/users/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to import users');
      }

      const data = await response.json();
      setResult(data);

      // If all successful, redirect after a delay
      if (data.failed === 0) {
        setTimeout(() => {
          router.push('/admin/users');
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload */}
      {!csvData.length && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Upload CSV File
          </label>
          <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 py-10">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer rounded-md bg-white font-medium text-primary-600 hover:text-primary-500"
                >
                  <span>Upload a file</span>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">CSV up to 10MB</p>
            </div>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>
      )}

      {/* Preview and Mapping */}
      {csvData.length > 0 && !result && (
        <>
          <div className="flex items-center gap-2 rounded-md bg-blue-50 p-4">
            <FileText className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-blue-800">
              <strong>{csvData.length}</strong> rows found in {file?.name}
            </p>
          </div>

          {/* Column Mapping */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-gray-900">
              Map CSV Columns
            </h3>
            <div className="space-y-4">
              {requiredFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700">
                    {field.label} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={columnMapping[field.key] || ''}
                    onChange={(e) =>
                      setColumnMapping({
                        ...columnMapping,
                        [field.key]: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">-- Select Column --</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {optionalFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700">
                    {field.label} <span className="text-gray-400">(Optional)</span>
                  </label>
                  <select
                    value={columnMapping[field.key] || ''}
                    onChange={(e) =>
                      setColumnMapping({
                        ...columnMapping,
                        [field.key]: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">-- Not Mapped --</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Default Organization
                </label>
                <select
                  value={defaultOrganization}
                  onChange={(e) => setDefaultOrganization(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Preview Table */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-gray-900">
              Preview (first 5 rows)
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {columnMapping.email && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Email</th>}
                    {columnMapping.name && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>}
                    {columnMapping.division && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Division</th>}
                    {columnMapping.jobRole && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Job Role</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {csvData.slice(0, 5).map((row, index) => (
                    <tr key={index}>
                      {columnMapping.email && <td className="px-4 py-2 text-sm text-gray-900">{row[columnMapping.email]}</td>}
                      {columnMapping.name && <td className="px-4 py-2 text-sm text-gray-900">{row[columnMapping.name]}</td>}
                      {columnMapping.division && <td className="px-4 py-2 text-sm text-gray-500">{row[columnMapping.division]}</td>}
                      {columnMapping.jobRole && <td className="px-4 py-2 text-sm text-gray-500">{row[columnMapping.jobRole]}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <p className="ml-3 text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={() => {
                setCSVData([]);
                setHeaders([]);
                setColumnMapping({});
                setFile(null);
              }}
              disabled={isProcessing}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={
                isProcessing ||
                !columnMapping.email ||
                !columnMapping.name ||
                !defaultOrganization
              }
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {isProcessing ? 'Importing...' : `Import ${csvData.length} Users`}
            </button>
          </div>
        </>
      )}

      {/* Import Result */}
      {result && (
        <div className="space-y-4">
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Import Complete
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    Successfully imported <strong>{result.success}</strong> users
                  </p>
                  {result.failed > 0 && (
                    <p className="mt-1">
                      Failed to import <strong>{result.failed}</strong> users
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Errors</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc space-y-1 pl-5">
                      {result.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => router.push('/admin/users')}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              View Users
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
