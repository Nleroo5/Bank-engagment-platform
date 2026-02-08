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
      name: "order",
      title: "Order",
      type: "number",
      description: "Display order of this section (1, 2, 3, etc.)",
    }),
    defineField({
      name: "sortOrder",
      title: "Sort Order (Legacy)",
      type: "number",
      description: "Legacy field - use order instead",
      hidden: true,
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 2,
      description:
        "Instructions specific to this section, shown above the questions",
    }),
    defineField({
      name: "directions",
      title: "Section Directions (Rich Text)",
      type: "array",
      of: [{ type: "block" }],
      description:
        "Rich text instructions specific to this section (optional - use description for simple text)",
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
      title: "Order",
      name: "orderAsc",
      by: [{ field: "order", direction: "asc" }],
    },
    {
      title: "Sort Order",
      name: "sortOrderAsc",
      by: [{ field: "sortOrder", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "title",
      order: "order",
      sortOrder: "sortOrder",
    },
    prepare({ title, order, sortOrder }) {
      const orderNum = order || sortOrder;
      return {
        title: orderNum ? `${orderNum}. ${title}` : title,
        subtitle: orderNum ? `Section ${orderNum}` : "Section",
      };
    },
  },
});
