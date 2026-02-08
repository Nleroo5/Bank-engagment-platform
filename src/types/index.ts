// Shared TypeScript types and interfaces

export type UserRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'VIEWER' | 'RESPONDENT';

export type SurveyType =
  | 'DEMOGRAPHICS'
  | 'LTE'
  | 'OTE'
  | 'MANAGERIAL'
  | 'ASSOCIATE_180';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
