'use client';

import { useEffect, useRef } from 'react';
import { SurveyCreatorComponent, SurveyCreator } from 'survey-creator-react';
import 'survey-core/survey-core.css';
import 'survey-creator-core/survey-creator-core.css';

interface SurveyCreatorProps {
  initialJson?: object;
  onSave?: (json: object) => void;
}

export function SurveyCreatorWidget({
  initialJson,
  onSave,
}: SurveyCreatorProps) {
  const creatorRef = useRef<SurveyCreator | null>(null);

  useEffect(() => {
    // Initialize the Survey Creator
    const creator = new SurveyCreator({
      showLogicTab: true,
      showTranslationTab: false,
      showJSONEditorTab: true,
      isAutoSave: false,
    });

    // Configure creator options
    creator.toolbox.allowExpandMultipleCategories = true;

    // Set initial JSON if provided
    if (initialJson) {
      creator.JSON = initialJson;
    }

    // Save handler
    creator.saveSurveyFunc = (
      saveNo: number,
      callback: (saveNo: number, success: boolean) => void
    ) => {
      if (onSave) {
        onSave(creator.JSON);
        callback(saveNo, true);
      } else {
        callback(saveNo, false);
      }
    };

    creatorRef.current = creator;

    return () => {
      // Cleanup
      if (creatorRef.current) {
        creatorRef.current.dispose();
      }
    };
  }, [initialJson, onSave]);

  if (!creatorRef.current) {
    return <div>Loading survey creator...</div>;
  }

  return (
    <div className="survey-creator-container">
      <SurveyCreatorComponent creator={creatorRef.current} />
    </div>
  );
}
