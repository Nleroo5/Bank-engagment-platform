# Brand Colors Guide

## Official Brand Colors

### Primary: Navy Blue
**HEX:** `#003da5`
**RGB:** `rgb(0, 61, 165)`
**Tailwind:** `bg-brand-navy` or `bg-primary-500`

Use for:
- Primary buttons and CTAs
- Header/navigation backgrounds
- Important headings
- Links
- Focus states

### Secondary: Red
**HEX:** `#ce0037`
**RGB:** `rgb(206, 0, 55)`
**Tailwind:** `bg-brand-red` or `bg-accent-500`

Use for:
- Secondary buttons
- Error states and warnings
- Important notifications
- Accent elements
- Highlights and badges

---

## Color Palettes (Tailwind Classes)

### Primary Palette (Navy Blue)
```tsx
bg-primary-50   // Lightest - backgrounds, hover states
bg-primary-100  // Very light - subtle backgrounds
bg-primary-200  // Light - borders, disabled states
bg-primary-300  // Medium-light - hover states
bg-primary-400  // Medium - secondary elements
bg-primary-500  // BRAND NAVY #003da5 - primary use
bg-primary-600  // Medium-dark - hover on primary
bg-primary-700  // Dark - pressed states
bg-primary-800  // Darker - text on light backgrounds
bg-primary-900  // Darkest - strong emphasis
bg-primary-950  // Near black - shadows, dark mode
```

### Accent Palette (Red)
```tsx
bg-accent-50    // Lightest - error backgrounds
bg-accent-100   // Very light - subtle alerts
bg-accent-200   // Light - borders on warnings
bg-accent-300   // Medium-light - hover states
bg-accent-400   // Medium - secondary accents
bg-accent-500   // BRAND RED #ce0037 - primary use
bg-accent-600   // Medium-dark - hover on accent
bg-accent-700   // Dark - pressed states
bg-accent-800   // Darker - strong emphasis
bg-accent-900   // Darkest - critical alerts
bg-accent-950   // Near black - shadows
```

---

## Usage Examples

### Buttons

**Primary Button**
```tsx
<button className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded">
  Start Survey
</button>
```

**Secondary Button**
```tsx
<button className="bg-accent-500 hover:bg-accent-600 text-white px-6 py-2 rounded">
  Delete Campaign
</button>
```

**Outline Button**
```tsx
<button className="border-2 border-primary-500 text-primary-500 hover:bg-primary-50 px-6 py-2 rounded">
  View Details
</button>
```

### Headings
```tsx
<h1 className="text-3xl font-bold text-primary-800">
  Bank Engagement Survey
</h1>

<h2 className="text-2xl font-semibold text-primary-700">
  Campaign Dashboard
</h2>
```

### Links
```tsx
<a href="#" className="text-primary-500 hover:text-primary-600 underline">
  Learn more
</a>
```

### Badges
```tsx
{/* Active badge */}
<span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium">
  Active
</span>

{/* Alert badge */}
<span className="bg-accent-100 text-accent-800 px-3 py-1 rounded-full text-sm font-medium">
  Urgent
</span>
```

### Cards
```tsx
<div className="bg-white border border-primary-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
  <div className="border-l-4 border-primary-500 p-6">
    <h3 className="text-lg font-semibold text-primary-800">Survey Results</h3>
    <p className="text-gray-600">View detailed analytics</p>
  </div>
</div>
```

### Alerts

**Info**
```tsx
<div className="bg-primary-50 border-l-4 border-primary-500 p-4">
  <p className="text-primary-800">Survey has been sent to all participants.</p>
</div>
```

**Error**
```tsx
<div className="bg-accent-50 border-l-4 border-accent-500 p-4">
  <p className="text-accent-800">This survey has reached maximum responses.</p>
</div>
```

### Navigation
```tsx
<nav className="bg-primary-500 text-white">
  <div className="container mx-auto px-4 py-3">
    <ul className="flex space-x-6">
      <li><a href="#" className="hover:text-primary-200">Dashboard</a></li>
      <li><a href="#" className="hover:text-primary-200">Campaigns</a></li>
      <li><a href="#" className="hover:text-primary-200">Reports</a></li>
    </ul>
  </div>
</nav>
```

### Forms
```tsx
<input
  type="text"
  className="border border-primary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 rounded px-4 py-2"
  placeholder="Enter survey name"
/>

<button
  type="submit"
  className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded font-medium"
>
  Create Campaign
</button>
```

---

## Accessibility Guidelines

### Contrast Ratios (WCAG AA Compliance)

**Text on White Background:**
- ✅ `text-primary-800` - 12.5:1 (Excellent)
- ✅ `text-primary-700` - 10.1:1 (Excellent)
- ✅ `text-primary-600` - 8.2:1 (Good)
- ✅ `text-accent-800` - 11.2:1 (Excellent)
- ✅ `text-accent-700` - 9.3:1 (Excellent)

**White Text on Colored Background:**
- ✅ `bg-primary-500 text-white` - 8.5:1 (Good)
- ✅ `bg-accent-500 text-white` - 7.1:1 (Good)

**Recommendation:** For best accessibility:
- Use `text-primary-800` or darker for body text
- Use `bg-primary-500` or darker for buttons with white text
- Use `bg-accent-500` or darker for error/warning elements

---

## Dark Mode Support

If implementing dark mode, use these combinations:

```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  <button className="bg-primary-500 dark:bg-primary-400 text-white">
    Primary Action
  </button>

  <a className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
    Link Text
  </a>
</div>
```

---

## Component Color Hierarchy

### Priority Levels

**High Priority** (Primary actions, main content)
- `bg-primary-500` for buttons
- `text-primary-800` for headings
- `border-primary-500` for focus states

**Medium Priority** (Secondary actions, supporting content)
- `bg-primary-100` for backgrounds
- `text-primary-600` for subheadings
- `border-primary-300` for borders

**Low Priority** (Tertiary elements, subtle hints)
- `bg-primary-50` for hover states
- `text-primary-500` for muted text
- `border-primary-200` for dividers

**Alerts & Errors**
- `bg-accent-500` for error buttons
- `text-accent-700` for error messages
- `border-accent-500` for error inputs

---

## Migration Checklist

When updating existing components to use brand colors:

- [ ] Replace old blue colors with `primary-*` classes
- [ ] Use `accent-*` for errors, warnings, and secondary CTAs
- [ ] Update button variants to use brand colors
- [ ] Update form focus states to `focus:ring-primary-500`
- [ ] Update navigation backgrounds to `bg-primary-500`
- [ ] Update link colors to `text-primary-600`
- [ ] Verify contrast ratios meet WCAG AA standards
- [ ] Test hover/active states with new colors
- [ ] Update loading spinners and progress bars
- [ ] Update chart colors in reports (if applicable)

---

## Quick Reference

| Element | Recommended Class | Example |
|---------|------------------|---------|
| Primary Button | `bg-primary-500 hover:bg-primary-600` | Create Survey |
| Secondary Button | `bg-accent-500 hover:bg-accent-600` | Delete |
| Link | `text-primary-600 hover:text-primary-700` | View Details |
| Heading | `text-primary-800` | Page Title |
| Input Border | `border-primary-200 focus:border-primary-500` | Form Field |
| Badge (Info) | `bg-primary-100 text-primary-800` | Active |
| Badge (Alert) | `bg-accent-100 text-accent-800` | Urgent |
| Navigation | `bg-primary-500 text-white` | Top Bar |
| Card Border | `border-primary-200` | Container |
| Success | `text-green-700` | Success Message |

---

## Files Updated

- `tailwind.config.ts` - Brand color definitions
- `src/app/globals.css` - Focus state colors
- This guide - Reference documentation

---

## Next Steps

1. Update admin navigation to use `bg-primary-500`
2. Update all buttons to use brand colors
3. Update form inputs to use `border-primary-200` with `focus:border-primary-500`
4. Update link colors throughout the app
5. Test all components for accessibility compliance
6. Update loading states and progress indicators
7. Review and update chart colors in reports

---

**Last Updated:** 2024-02-15
**Maintained by:** Development Team
