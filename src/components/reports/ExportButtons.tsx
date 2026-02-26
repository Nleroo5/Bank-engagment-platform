'use client';

import { useState } from 'react';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';

interface ExportButtonsProps {
  campaignId: string;
  surveyTitle: string;
}

export function ExportButtons({ campaignId, surveyTitle }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'xlsx' | 'pdf' | null>(null);

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    setIsExporting(true);
    setExportType(format);

    try {
      const response = await fetch(
        `/api/reports/${campaignId}/export?format=${format}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Export failed');
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Extract filename from Content-Disposition header, fall back to generic
      let filename = `${surveyTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Report.${format}`;
      const disposition = response.headers.get('Content-Disposition');
      if (disposition) {
        const match = disposition.match(/filename="(.+)"/);
        if (match?.[1]) filename = match[1];
      }

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={() => handleExport('xlsx')}
        disabled={isExporting}
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {isExporting && exportType === 'xlsx' ? (
          <>
            <Download className="h-4 w-4 animate-bounce" />
            Exporting...
          </>
        ) : (
          <>
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </>
        )}
      </button>

      <button
        onClick={() => handleExport('pdf')}
        disabled={isExporting}
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {isExporting && exportType === 'pdf' ? (
          <>
            <Download className="h-4 w-4 animate-bounce" />
            Exporting...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4" />
            Export PDF
          </>
        )}
      </button>
    </div>
  );
}
