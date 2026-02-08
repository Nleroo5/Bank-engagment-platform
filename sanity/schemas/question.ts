import { defineType, defineField } from "sanity";

export const question = defineType({
  name: "question",
  title: "Question",
  type: "document",
  fields: [
    defineField({
      name: "number",
      title: "Question Number",
      type: "number",
      description: "Display order within the survey (1-40)",
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "text",
      title: "Question Text",
      type: "text",
      rows: 3,
      description: "The statement presented to the respondent",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "reference",
      to: [{ type: "category" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "section",
      title: "Parent Section",
      type: "reference",
      to: [{ type: "section" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "isReversed",
      title: "Reverse Scored",
      type: "boolean",
      description:
        "If true, the scoring is inverted at report time (e.g., 1 becomes 3 on a 3-point scale). Used in Managerial Assessment and Associate 180.",
      initialValue: false,
    }),
    defineField({
      name: "anchorText",
      title: "Anchor Text (Right Side)",
      type: "string",
      description:
        'Optional descriptor shown on the right side of the scale for context. Used primarily in the LTE survey (e.g., "Objectives are always thoroughly discussed with others on the team").',
    }),
    defineField({
      name: "fieldType",
      title: "Demographics Field Type",
      type: "string",
      description:
        "For demographics surveys only. Specifies the type of input field to display.",
      options: {
        list: [
          { title: "Bank Name (text)", value: "bankName" },
          { title: "Country (dropdown)", value: "country" },
          { title: "State (dropdown)", value: "state" },
          { title: "Metro Area (text)", value: "metro" },
          { title: "City (text)", value: "city" },
          { title: "Bank Size (radio)", value: "bankSize" },
          { title: "Device Used (radio)", value: "device" },
          { title: "Employment Status (radio)", value: "employmentStatus" },
          { title: "Gender (radio)", value: "gender" },
          { title: "Time at Bank (radio)", value: "timeAtBank" },
          { title: "Bank Experience (radio)", value: "bankExperience" },
          { title: "Division (radio)", value: "division" },
          { title: "Job Role (radio)", value: "jobRole" },
        ],
      },
    }),
  ],
  orderings: [
    {
      title: "Question Number",
      name: "numberAsc",
      by: [{ field: "number", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      number: "number",
      text: "text",
      categoryName: "category.name",
      isReversed: "isReversed",
    },
    prepare({ number, text, categoryName, isReversed }) {
      const truncated =
        text && text.length > 60 ? text.substring(0, 60) + "..." : text;
      return {
        title: `Q${number}: ${truncated}`,
        subtitle: `${categoryName || "No category"}${isReversed ? " (REVERSED)" : ""}`,
      };
    },
  },
});
