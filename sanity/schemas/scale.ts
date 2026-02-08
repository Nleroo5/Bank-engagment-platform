import { defineType, defineField } from 'sanity';

export const scale = defineType({
  name: 'scale',
  title: 'Rating Scale',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'e.g., "5-Point Likert", "3-Point Frequency"',
    }),
    defineField({
      name: 'name',
      title: 'Scale Name (Legacy)',
      type: 'string',
      description: 'Legacy field - use title instead',
      hidden: true,
    }),
    defineField({
      name: 'scaleType',
      title: 'Scale Type',
      type: 'string',
      options: {
        list: [
          { title: 'Likert 5-Point (Agreement)', value: 'likert5' },
          { title: 'Likert 3-Point (Frequency)', value: 'likert3' },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'min',
      title: 'Minimum Value',
      type: 'number',
      initialValue: 1,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'max',
      title: 'Maximum Value',
      type: 'number',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'minLabel',
      title: 'Minimum Label',
      type: 'string',
      description: 'e.g., "Strongly Disagree", "Rarely"',
    }),
    defineField({
      name: 'maxLabel',
      title: 'Maximum Label',
      type: 'string',
      description: 'e.g., "Strongly Agree", "Frequently"',
    }),
    defineField({
      name: 'midLabel',
      title: 'Middle Label',
      type: 'string',
      description: 'e.g., "Neutral", "Sometimes" (for 3 and 5 point scales)',
    }),
    defineField({
      name: 'labels',
      title: 'Scale Labels (Detailed)',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'value',
              title: 'Value',
              type: 'number',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: { value: 'value', label: 'label' },
            prepare({ value, label }) {
              return { title: `${value}: ${label}` };
            },
          },
        },
      ],
      description:
        'Optional: Define each point on the scale explicitly. E.g., { value: 5, label: "Strongly Agree" }. Use minLabel/maxLabel/midLabel for simpler scales.',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      name: 'name',
      scaleType: 'scaleType',
      min: 'min',
      max: 'max',
    },
    prepare({ title, name, scaleType, min, max }) {
      const displayTitle = title || name;
      const range = min && max ? `(${min}-${max})` : '';
      return {
        title: displayTitle,
        subtitle: `${scaleType} ${range}`.trim(),
      };
    },
  },
});
