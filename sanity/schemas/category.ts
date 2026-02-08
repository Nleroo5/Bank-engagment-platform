import { defineType, defineField } from 'sanity';

export const category = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description:
        'e.g., "Leadership", "Communication", "Culture", "Accountability", "Execution", "Associate", "Team Dynamics"',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'colorCode',
      title: 'Color Code',
      type: 'string',
      description:
        'Hex color for UI display (matches the color coding on the paper forms)',
      validation: (rule) =>
        rule.regex(/^#[0-9A-Fa-f]{6}$/, {
          name: 'hex color',
          invert: false,
        }),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      description: 'Display order in reports and dashboards',
    }),
    defineField({
      name: 'weight',
      title: 'Scoring Weight Multiplier',
      type: 'number',
      description:
        'Multiplier applied to category totals for weighted scoring (e.g., 1.75 for Communication, 2.3 for Culture). Default is 1.0 (no weighting). Used in report calculations.',
      initialValue: 1.0,
      validation: (rule) =>
        rule
          .required()
          .min(0.1)
          .max(10)
          .precision(2)
          .custom((weight) => {
            if (weight === undefined || weight === null) {
              return 'Weight is required';
            }
            if (weight <= 0) {
              return 'Weight must be greater than 0';
            }
            return true;
          }),
    }),
  ],
  preview: {
    select: {
      title: 'name',
      colorCode: 'colorCode',
      weight: 'weight',
    },
    prepare({ title, colorCode, weight }) {
      const weightDisplay = weight ? `×${weight}` : '×1.0';
      const colorDisplay = colorCode || 'No color';
      return {
        title,
        subtitle: `${colorDisplay} | Weight: ${weightDisplay}`,
      };
    },
  },
});
