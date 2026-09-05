---
name: tailwind
description: Tailwind styling for `apps/web`, including responsive layouts, theme tokens, and utility composition. Applicable when writing `.tsx`/`.jsx` files that involve styling, designing responsive layouts, customizing the Tailwind theme, or configuring `tailwind.config.js`.
---

# Tailwind

## Purpose

This skill guides the agent in applying Tailwind CSS's utility-first approach to style user interfaces efficiently, consistently, and performantly. It emphasizes using existing utility classes directly in markup, only reaching for custom CSS or arbitrary values when truly necessary, and optimizing for production builds.

---

## When to Load

- User is writing, reviewing, or refactoring any `.tsx` or `.jsx` file that contains `className` attributes.
- User mentions: `tailwind`, `className`, `flex`, `grid`, `md:`, `lg:`, `dark:`, `hover:`, `focus:`, `@apply`, `arbitrary value`, `tailwind.config`.
- User asks about layout, spacing, typography, colors, responsive behavior, or dark mode implementation.
- User is designing new UI components that require styling decisions.

---

## When NOT to Load

- Pure backend logic or database operations.
- Infrastructure or deployment configuration.
- Styles that are purely global and not using Tailwind utilities (e.g., CSS reset, third-party CSS libraries).
- General TypeScript/React logic without styling implications.

---

## Core Principles

1. **Utility-First** – Style elements using pre-existing utility classes directly in `className`. Avoid writing custom CSS unless the utility classes cannot express the design.
2. **Responsive by Default** – Design mobile-first using responsive prefixes (`sm:`, `md:`, `lg:`). Base styles apply to all screen sizes; prefixes override for larger screens.
3. **Configuration Over Arbitrary Values** – Prefer extending `tailwind.config.js` for custom design tokens (colors, spacing, font sizes) over using arbitrary values (`w-[120px]`).
4. **Component-Driven Abstraction** – Extract repeated combinations of utilities into reusable React components, not into custom CSS classes using `@apply`. Prefer component composition over class extraction.
5. **State Variants** – Use state variants (`hover:`, `focus:`, `active:`, `disabled:`) directly in `className` to manage interactive states without writing JavaScript for styling.

---

## Decision Rules

### When to Use Utilities vs. Custom CSS

- **IF** the desired style exists as a built-in utility, **THEN** use it directly in `className` – do not write custom CSS.
- **IF** the desired style is a combination of 3+ utilities that repeats exactly across more than 3 components, **THEN** consider extracting it into a reusable component (preferred) OR using `@apply` (only if component extraction is impractical).
- **IF** the style is a single-use value not available in the theme (e.g., `w-[127px]`), **THEN** use arbitrary values directly.
- **IF** the style is a semantic global style (e.g., `<body>` background, CSS resets), **THEN** place it in a global stylesheet (e.g., `index.css`), **NOT** in a component.

### When to Use `@apply`

- **DO NOT** use `@apply` as a default – it is an escape hatch, not a replacement for component composition.
- **IF** you need to apply the same group of utilities to a primitive HTML element inside a component (e.g., a styled `<button>`), **THEN** create a React component instead of using `@apply`.
- **IF** you are maintaining a legacy codebase where creating components is prohibitive, **THEN** use `@apply` sparingly.
- **NEVER** use `@apply` for a single utility class – it adds no value and increases bundle size.

### Theme Customization

- **IF** a custom color, font, or spacing value is used in 3+ locations across the codebase, **THEN** extend `tailwind.config.js` with a new design token.
- **IF** a value is used only once and is specific to a single component, **THEN** use an arbitrary value (`w-[120px]`, `bg-[#123456]`).
- **IF** you are adding new breakpoints, **THEN** extend the `screens` object in the config.

### Responsive Design

- **ALWAYS** start with mobile styles (no prefix) for the smallest screen.
- **THEN** add `sm:` for tablets, `md:` for small desktops, `lg:` for large screens, `xl:` and `2xl:` for extra large.
- **IF** a utility should only apply at a specific breakpoint and above, **THEN** prefix it with that breakpoint – do not use JavaScript media queries for layout.

### Dark Mode

- **IF** the project supports dark mode, **THEN** enable the `dark:` variant in the config and apply `dark:variant` for dark-specific styles.
- **IF** dark mode uses the `class` strategy, **THEN** apply `dark:` classes alongside the base classes – the dark class will toggle them via a parent `dark` class.

---

## Best Practices

1. **Keep `className` readable** – Use multi-line formatting for components with more than 3 classes.
   ```tsx
   <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
   ```
2. **Order classes consistently** – Organize classes by type: layout (display, position) → flex/grid → spacing (padding, margin) → sizing → typography → colors → effects → variants.
3. **Use `clsx` or `cn` for conditional classes** – Prefer a utility function to conditionally apply classes instead of manually concatenating strings.
   ```tsx
   const className = cn("base-class", { "active-class": isActive });
   ```
4. **Configure `content` paths** – Always include all file paths that contain Tailwind classes (`content: ['./src/**/*.{js,jsx,ts,tsx}']`) to purge unused styles in production.
5. **Use semantic colors** – Define colors in `tailwind.config.js` with meaningful names (e.g., `primary`, `secondary`, `accent`) instead of hardcoding hex values in components.
6. **Leverage spacing scale** – Use the built-in spacing scale (`p-1`, `p-2`, ..., `p-12`) instead of arbitrary pixel values to maintain consistency.
7. **Use `group` for sibling interactions** – For hover/focus effects on parent that affect children, use `group` and `group-hover:` variants.

---

## Anti-Patterns

| Anti-Pattern                                     | Why it is wrong (official)                                                                | Correct approach                                                            |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Using `@apply` for every component class         | Creates a pseudo-CSS approach; defeats the utility-first benefits; increases bundle size. | Use utility classes directly in JSX or extract to a component.              |
| Hardcoding arbitrary values in multiple places   | Inconsistent design system; difficult to maintain.                                        | Extend the theme configuration with a new token.                            |
| Adding `!important` to utilities                 | Overrides cascading rules; indicates poor specificity management.                         | Fix the specificity hierarchy or use the correct variant prefix.            |
| Using inline `style={{}}` for styling            | Bypasses Tailwind's performance optimizations; harder to maintain.                        | Use Tailwind utilities or arbitrary values (`w-[120px]`).                   |
| Forgetting `content` paths in production         | Tailwind cannot purge unused styles, leading to huge CSS bundles.                         | Always keep `content` up-to-date with all source file extensions.           |
| Writing custom CSS for layout                    | Duplicates responsive utilities and adds maintenance burden.                              | Use Tailwind's grid/flex/responsive utilities directly.                     |
| Nesting too many utilities in a single className | Reduces readability and may cause style conflicts.                                        | Split into smaller, well-named components or use consistent ordering.       |
| Using fixed `px` values over spacing scale       | Breaks consistency with the design system.                                                | Use the `p-`, `m-`, `w-`, `h-` scale classes; only use `px` for edge cases. |

---

## Common Mistakes & Edge Cases

| Mistake                            | Symptom                                                                        | Solution (official)                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `dark:` variant not working        | Dark mode styles do not apply.                                                 | Ensure `darkMode: 'class'` in config and that the `dark` class is added to a parent HTML element.                     |
| Classes removed in production      | Missing `content` paths causing purging of used classes.                       | Verify `content` includes all file extensions (`.tsx`, `.jsx`, `.html`, `.mdx`).                                      |
| Responsive order wrong             | Styles apply at incorrect screen sizes.                                        | Always apply base (mobile-first) styles first, then override with breakpoints. Check specificity.                     |
| Arbitrary value syntax invalid     | Build errors or style not applied.                                             | Use correct bracket syntax: `w-[120px]`, `bg-[#123456]` – no spaces inside brackets unless using complex expressions. |
| Conflicting utility classes        | e.g., `p-4` and `p-2` on the same element; the latter wins due to specificity. | Remove the conflicting utility; keep only the desired one.                                                            |
| Custom CSS overriding utilities    | Due to CSS order or specificity.                                               | Ensure custom CSS is minimal and defined before Tailwind utilities if overwriting; better to use config.              |
| Transitions on hover not working   | Forgetting the `transition` or `duration` utility.                             | Add `transition-all` or `transition-colors` with `duration-200` to enable smooth animations.                          |
| Adding `!important` to `className` | Conflicts with existing `!important` utilities.                                | Use variant prefixes (`hover:`, `focus:`) to increase specificity naturally.                                          |

---

## Related Skills

- `react` – for applying Tailwind classes within React component structures.
- `frontend-ui-engineering` – for combining Tailwind with component libraries like shadcn/ui.
- `accessibility` – for ensuring styled elements maintain proper semantic roles and focus states.
- `performance` – for optimizing CSS delivery through proper purging and lazy-loading techniques.

---

## Official References

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Utility-First Fundamentals](https://tailwindcss.com/docs/utility-first)
- [Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [Customizing the Theme](https://tailwindcss.com/docs/theme)
- [Using `@apply`](https://tailwindcss.com/docs/functions-and-directives#apply)
- [Content Configuration](https://tailwindcss.com/docs/content-configuration)
- [Arbitrary Values](https://tailwindcss.com/docs/adding-custom-styles#using-arbitrary-values)
- [Optimizing for Production](https://tailwindcss.com/docs/optimizing-for-production)
