import { defineType, defineField } from "sanity";

export const category = defineType({
  name: "category",
  title: "Category",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      description:
        'e.g., "Leadership", "Communication", "Culture", "Accountability", "Execution", "Associate", "Team Dynamics"',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "colorCode",
      title: "Color Code",
      type: "string",
      description:
        "Hex color for UI display (matches the color coding on the paper forms)",
      validation: (rule) =>
        rule.regex(/^#[0-9A-Fa-f]{6}$/, {
          name: "hex color",
          invert: false,
        }),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 2,
    }),
    defineField({
      name: "sortOrder",
      title: "Sort Order",
      type: "number",
      description: "Display order in reports and dashboards",
    }),
  ],
  preview: {
    select: {
      title: "name",
      colorCode: "colorCode",
    },
    prepare({ title, colorCode }) {
      return {
        title,
        subtitle: colorCode || "No color set",
      };
    },
  },
});
