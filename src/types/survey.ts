// Configuration stored in Question.config for demographics questions
export interface DemographicsQuestionConfig {
  fieldType: string;        // e.g., "bankSize", "division", "bankName"
  demographicKey: string;   // Key used in demographics JSON storage (must match report keys)
  inputType: 'text' | 'dropdown' | 'radio';
  options?: string[];       // Selectable values for dropdown/radio
  allowOther?: boolean;     // Show "Other" text input option
  placeholder?: string;     // Placeholder for text/dropdown inputs
  autoAdvance?: boolean;    // Whether selecting an option auto-advances to next question
}

// Demographics question shown as inline preamble before every survey
export type DemographicsQuestion = {
  _id: string;
  number: number;
  text: string;
  fieldType: string;
  config?: DemographicsQuestionConfig;
};

// Scale label for rating scales
export interface ScaleLabel {
  value: number;
  label: string;
}

// Rating scale definition
export interface Scale {
  _id: string;
  _type: 'scale';
  name: string;
  scaleType: 'likert5' | 'likert3';
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
  midLabel?: string;
  labels?: ScaleLabel[];
}

// Category for question grouping
export interface Category {
  _id: string;
  _type: 'category';
  name: string;
  colorCode?: string;
  description?: string;
  sortOrder?: number;
  weight?: number; // Legacy category-level weight (scoring now uses per-question weights)
}

// Question with populated category reference
export interface Question {
  _id: string;
  _type: 'question';
  number: number;
  text: string;
  category: Category;
  isReversed: boolean;
  weight: number; // Per-question scoring weight multiplier (default 1.0)
  anchorText?: string;
  fieldType?: string; // For demographics: 'bankName', 'state', 'bankSize', 'division', etc.
  config?: DemographicsQuestionConfig | null;
  slug?: {
    current: string;
  };
}

// Section with populated questions
export interface Section {
  _id: string;
  _type: 'section';
  title: string;
  sortOrder: number;
  description?: string;
  directions?: string;
  questions: Question[];
}

// Full survey with all nested content
export interface Survey {
  _id: string;
  _type: 'survey';
  title: string;
  slug: {
    current: string;
  };
  surveyNumber?: number;
  surveyType:
    | 'demographics'
    | 'likert5'
    | 'likert3'
    | 'managerial'
    | 'ote'
    | 'associate_180';
  description?: string;
  instructions?: string;
  sections: Section[];
  scale?: Scale;
  respondentNameField?: string;
  requiresManagerName?: boolean;
  anonymityRequired?: boolean;
  minimumRespondents?: number;
  welcomeMessage?: string;
  completionMessage?: string;
  estimatedMinutes?: number;
  isActive: boolean;
}

// Survey list item (for overview/listing)
export interface SurveyListItem {
  _id: string;
  title: string;
  slug: {
    current: string;
  };
  surveyNumber?: number;
  surveyType: string;
  isActive: boolean;
  estimatedMinutes?: number;
}
