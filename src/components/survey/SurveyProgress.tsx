'use client';

interface SurveyProgressProps {
  totalQuestions: number;
  answeredQuestions: number;
}

export function SurveyProgress({
  totalQuestions,
  answeredQuestions,
}: SurveyProgressProps) {
  const percentage = Math.round((answeredQuestions / totalQuestions) * 100);

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">
          Progress: {answeredQuestions} of {totalQuestions} questions
        </span>
        <span className="font-medium text-gray-700">{percentage}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full bg-primary-600 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
