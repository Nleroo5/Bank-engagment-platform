import { defineType, defineField } from "sanity";

export const survey = defineType({
  name: "survey",
  title: "Survey",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "surveyNumber",
      title: "Survey Number",
      type: "number",
      description: "The survey identifier number (e.g., 4 for LTE, 5 for OTE)",
    }),
    defineField({
      name: "surveyType",
      title: "Survey Type",
      type: "string",
      options: {
        list: [
          { title: "Demographics", value: "demographics" },
          { title: "Likert 5-Point", value: "likert5" },
          { title: "Likert 3-Point", value: "likert3" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "instructions",
      title: "Instructions",
      type: "array",
      of: [{ type: "block" }],
      description: "Rich text instructions shown to respondents before they begin",
    }),
    defineField({
      name: "sections",
      title: "Sections",
      type: "array",
      of: [{ type: "reference", to: [{ type: "section" }] }],
      description: "Ordered list of sections in this survey",
    }),
    defineField({
      name: "scale",
      title: "Rating Scale",
      type: "reference",
      to: [{ type: "scale" }],
    }),
    defineField({
      name: "respondentNameField",
      title: "Respondent Name Field Label",
      type: "string",
      description:
        'Label for the name field, e.g., "Executive or Manager Name" or "Associate Name". Leave blank if no name field is needed.',
    }),
    defineField({
      name: "welcomeMessage",
      title: "Welcome Message",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "completionMessage",
      title: "Completion Message",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "estimatedMinutes",
      title: "Estimated Completion Time (minutes)",
      type: "number",
    }),
    defineField({
      name: "isActive",
      title: "Active",
      type: "boolean",
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      title: "title",
      surveyNumber: "surveyNumber",
      surveyType: "surveyType",
    },
    prepare({ title, surveyNumber, surveyType }) {
      return {
        title: surveyNumber ? `Survey ${surveyNumber}: ${title}` : title,
        subtitle: surveyType,
      };
    },
  },
});
