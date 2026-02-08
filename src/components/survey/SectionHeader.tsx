'use client';

import type { Section } from '@/types/survey';

interface SectionHeaderProps {
  section: Section;
  sectionNumber: number;
  totalSections: number;
}

export function SectionHeader({
  section,
  sectionNumber,
  totalSections,
}: SectionHeaderProps) {
  return (
    <div className="mb-6">
      <div className="mb-2 text-sm font-medium text-gray-500">
        Section {sectionNumber} of {totalSections}
      </div>
      <h2 className="mb-3 text-2xl font-bold text-gray-900">{section.title}</h2>
      {(section.description ||
        (section.directions && section.directions.length > 0)) && (
        <div className="rounded-md bg-gray-50 p-4">
          <p className="text-sm text-gray-700">
            {section.description ||
              'Please rate each statement using the scale provided.'}
          </p>
        </div>
      )}
    </div>
  );
}
