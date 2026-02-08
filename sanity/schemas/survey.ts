import { defineType, defineField } from 'sanity';

export const survey = defineType({
  name: 'survey',
  title: 'Survey',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      description:
        'Auto-generated from title. Optional - will be created automatically if not set.',
    }),
    defineField({
      name: 'surveyNumber',
      title: 'Survey Number',
      type: 'number',
      description: 'The survey identifier number (e.g., 4 for LTE, 5 for OTE)',
    }),
    defineField({
      name: 'surveyType',
      title: 'Survey Type',
      type: 'string',
      options: {
        list: [
          { title: 'Demographics', value: 'demographics' },
          { title: 'Likert 5-Point', value: 'likert5' },
          { title: 'Likert 3-Point', value: 'likert3' },
          { title: 'Managerial Assessment', value: 'managerial' },
          { title: 'Operational Team Effectiveness', value: 'ote' },
          { title: 'Associate 180° Assessment', value: 'associate_180' },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      description: 'Brief description of the survey purpose',
    }),
    defineField({
      name: 'instructions',
      title: 'Instructions',
      type: 'text',
      rows: 3,
      description:
        'Instructions shown to respondents before they begin. Can be plain text or rich text.',
    }),
    defineField({
      name: 'requiresManagerName',
      title: 'Requires Manager Name',
      type: 'boolean',
      description:
        'If true, survey requires entering the name of the manager/associate being evaluated',
      initialValue: false,
    }),
    defineField({
      name: 'anonymityRequired',
      title: 'Anonymity Required',
      type: 'boolean',
      description:
        'If true, individual responses are never shown (Associate 180 only). Requires minimum 5 respondents for reports.',
      initialValue: false,
    }),
    defineField({
      name: 'minimumRespondents',
      title: 'Minimum Respondents',
      type: 'number',
      description:
        'Minimum number of respondents required before reports can be generated (typically 5 for anonymous surveys)',
      initialValue: 1,
    }),
    defineField({
      name: 'sections',
      title: 'Sections',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'section' }] }],
      description: 'Ordered list of sections in this survey',
    }),
    defineField({
      name: 'scale',
      title: 'Rating Scale',
      type: 'reference',
      to: [{ type: 'scale' }],
    }),
    defineField({
      name: 'respondentNameField',
      title: 'Respondent Name Field Label',
      type: 'string',
      description:
        'Label for the name field, e.g., "Executive or Manager Name" or "Associate Name". Leave blank if no name field is needed.',
    }),
    defineField({
      name: 'welcomeMessage',
      title: 'Welcome Message',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'completionMessage',
      title: 'Completion Message',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'estimatedMinutes',
      title: 'Estimated Completion Time (minutes)',
      type: 'number',
    }),
    defineField({
      name: 'isActive',
      title: 'Active',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      surveyNumber: 'surveyNumber',
      surveyType: 'surveyType',
    },
    prepare({ title, surveyNumber, surveyType }) {
      return {
        title: surveyNumber ? `Survey ${surveyNumber}: ${title}` : title,
        subtitle: surveyType,
      };
    },
  },
});
