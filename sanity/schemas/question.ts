import { defineType, defineField } from 'sanity';

export const question = defineType({
  name: 'question',
  title: 'Question',
  type: 'document',
  fields: [
    defineField({
      name: 'questionNumber',
      title: 'Question Number',
      type: 'number',
      description: 'Display order within the survey (1-40)',
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'number',
      title: 'Question Number (Legacy)',
      type: 'number',
      description: 'Legacy field - use questionNumber instead',
      hidden: true,
    }),
    defineField({
      name: 'questionText',
      title: 'Question Text',
      type: 'text',
      rows: 3,
      description: 'The statement presented to the respondent',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'text',
      title: 'Question Text (Legacy)',
      type: 'text',
      description: 'Legacy field - use questionText instead',
      hidden: true,
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'category' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'scale',
      title: 'Rating Scale',
      type: 'reference',
      to: [{ type: 'scale' }],
      description: 'The rating scale used for this question',
    }),
    defineField({
      name: 'isReversed',
      title: 'Reverse Scored',
      type: 'boolean',
      description:
        'If true, the scoring is inverted at report time (e.g., 1 becomes 3 on a 3-point scale). Used in Managerial Assessment and Associate 180.',
      initialValue: false,
    }),
    defineField({
      name: 'isRequired',
      title: 'Required',
      type: 'boolean',
      description: 'Whether this question must be answered',
      initialValue: true,
    }),
    defineField({
      name: 'anchorText',
      title: 'Anchor Text (Right Side)',
      type: 'string',
      description:
        'Optional descriptor shown on the right side of the scale for context. Used primarily in the LTE survey (e.g., "Objectives are always thoroughly discussed with others on the team").',
    }),
    defineField({
      name: 'fieldType',
      title: 'Demographics Field Type',
      type: 'string',
      description:
        'For demographics surveys only. Specifies the type of input field to display.',
      options: {
        list: [
          { title: 'Bank Name (text)', value: 'bankName' },
          { title: 'Country (dropdown)', value: 'country' },
          { title: 'State (dropdown)', value: 'state' },
          { title: 'Metro Area (text)', value: 'metro' },
          { title: 'City (text)', value: 'city' },
          { title: 'Bank Size (radio)', value: 'bankSize' },
          { title: 'Device Used (radio)', value: 'device' },
          { title: 'Employment Status (radio)', value: 'employmentStatus' },
          { title: 'Gender (radio)', value: 'gender' },
          { title: 'Time at Bank (radio)', value: 'timeAtBank' },
          { title: 'Bank Experience (radio)', value: 'bankExperience' },
          { title: 'Division (radio)', value: 'division' },
          { title: 'Job Role (radio)', value: 'jobRole' },
        ],
      },
    }),
  ],
  orderings: [
    {
      title: 'Question Number',
      name: 'numberAsc',
      by: [{ field: 'number', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      questionNumber: 'questionNumber',
      number: 'number',
      questionText: 'questionText',
      text: 'text',
      categoryName: 'category.name',
      isReversed: 'isReversed',
    },
    prepare({
      questionNumber,
      number,
      questionText,
      text,
      categoryName,
      isReversed,
    }) {
      const qNum = questionNumber || number;
      const qText = questionText || text;
      const truncated =
        qText && qText.length > 60 ? qText.substring(0, 60) + '...' : qText;
      return {
        title: `Q${qNum}: ${truncated}`,
        subtitle: `${categoryName || 'No category'}${isReversed ? ' (REVERSED)' : ''}`,
      };
    },
  },
});
