import { defineType, defineField } from "sanity";

export const section = defineType({
  name: "section",
  title: "Section",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description:
        'e.g., "Goal Setting", "Roles within the Bank", "Operating Effectiveness"',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "sortOrder",
      title: "Sort Order",
      type: "number",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "survey",
      title: "Parent Survey",
      type: "reference",
      to: [{ type: "survey" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "directions",
      title: "Section Directions",
      type: "array",
      of: [{ type: "block" }],
      description:
        "Instructions specific to this section, shown above the questions",
    }),
    defineField({
      name: "questions",
      title: "Questions",
      type: "array",
      of: [{ type: "reference", to: [{ type: "question" }] }],
      description: "Ordered list of questions in this section",
    }),
  ],
  orderings: [
    {
      title: "Sort Order",
      name: "sortOrderAsc",
      by: [{ field: "sortOrder", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "title",
      sortOrder: "sortOrder",
      surveyTitle: "survey.title",
    },
    prepare({ title, sortOrder, surveyTitle }) {
      return {
        title: `${sortOrder}. ${title}`,
        subtitle: surveyTitle,
      };
    },
  },
});
