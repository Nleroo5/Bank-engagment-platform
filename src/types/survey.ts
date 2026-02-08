import { PortableTextBlock } from '@portabletext/types';

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
  weight: number; // Scoring weight multiplier (e.g., 1.75, 2.3) - default 1.0
}

// Question with populated category reference
export interface Question {
  _id: string;
  _type: 'question';
  number: number;
  text: string;
  category: Category;
  isReversed: boolean;
  anchorText?: string;
  fieldType?: string; // For demographics: 'bankName', 'state', 'bankSize', 'division', etc.
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
  directions?: PortableTextBlock[];
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
  instructions?: PortableTextBlock[] | string;
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
