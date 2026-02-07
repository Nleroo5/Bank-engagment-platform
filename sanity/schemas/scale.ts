import { defineType, defineField } from "sanity";

export const scale = defineType({
  name: "scale",
  title: "Rating Scale",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Scale Name",
      type: "string",
      description: 'e.g., "5-Point Likert", "3-Point Frequency"',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "scaleType",
      title: "Scale Type",
      type: "string",
      options: {
        list: [
          { title: "Likert 5-Point (Agreement)", value: "likert5" },
          { title: "Likert 3-Point (Frequency)", value: "likert3" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "min",
      title: "Minimum Value",
      type: "number",
      initialValue: 1,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "max",
      title: "Maximum Value",
      type: "number",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "labels",
      title: "Scale Labels",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "value",
              title: "Value",
              type: "number",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "label",
              title: "Label",
              type: "string",
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: { value: "value", label: "label" },
            prepare({ value, label }) {
              return { title: `${value}: ${label}` };
            },
          },
        },
      ],
      description:
        'Define each point on the scale. E.g., { value: 5, label: "Strongly Agree" }',
    }),
  ],
  preview: {
    select: { title: "name", scaleType: "scaleType" },
    prepare({ title, scaleType }) {
      return { title, subtitle: scaleType };
    },
  },
});
