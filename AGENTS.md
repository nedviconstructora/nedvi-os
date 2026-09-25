# NEDVI OS Development Rules

This document defines the permanent development standards for NEDVI OS. All future code, design, and architecture work must follow these rules unless a documented technical decision explicitly supersedes them.

## Project Vision

NEDVI OS is a premium enterprise operating system for construction companies. It brings projects, clients, quotes, worksites, people, inventory, communications, reporting, and planning into one reliable workspace.

The product must feel calm, precise, fast, and trustworthy. Every feature should reduce operational friction, make business state easier to understand, and support confident decisions.

## Architecture

- Use Next.js 15 with the App Router and TypeScript.
- Prefer server components by default. Use client components only when interactivity, browser APIs, or client state requires them.
- Keep route-level composition in `src/app`.
- Use route groups such as `(auth)` and `(dashboard)` to organize layouts without affecting URLs.
- Keep domain behavior in feature modules rather than placing business logic in route files.
- Keep external integrations and data access in `src/services`.
- Keep framework-agnostic helpers in `src/lib`.
- Keep shared state in `src/store` only when state cannot remain local to a component or feature.
- Use the `@/*` path alias for imports from `src`.
- Keep UI components presentational and composable. Pass data and callbacks through typed props.
- Do not introduce a new library when an existing project utility or established pattern solves the problem.

## Folder Structure

```text
src/
  app/
    (auth)/          Authentication routes and layouts
    (dashboard)/     Authenticated application routes and layouts
    api/              Route handlers when server endpoints are required
    globals.css      Global styles and design tokens
  components/
    ui/              Generic reusable primitives
    layout/          Application shell, sidebar, and header components
    dashboard/       Dashboard-specific widgets
    auth/            Authentication-specific components
  config/             Application configuration and feature flags
  features/           Domain-oriented modules and workflows
  hooks/              Shared React hooks
  lib/                Framework-agnostic utilities
  services/           API clients, integrations, and data access
  store/              Shared client-side state
  styles/             Additional style modules or tokens
  types/              Shared TypeScript types
```

Place a new file in the narrowest folder that owns its responsibility. Avoid adding files directly to `src` unless they are genuine application-wide entry points.

## Coding Standards

- Use TypeScript strict mode and provide explicit types for public component props, service contracts, and shared data.
- Prefer small functions with one clear responsibility.
- Keep rendering logic readable; extract complex sections into named components.
- Prefer immutable data transformations and pure functions.
- Avoid `any`. Use `unknown` with type narrowing when the type is not known.
- Handle loading, empty, error, and success states for asynchronous or data-driven UI.
- Do not add comments that merely restate code. Add comments only when they explain a non-obvious decision.
- Preserve existing formatting and avoid unrelated refactors.
- Run linting and type checks before considering a change complete.
- Never commit secrets, credentials, tokens, generated build output, or local environment files.

## UI/UX Principles

- Build interfaces for repeated enterprise workflows: scanning, comparing, filtering, reviewing, and acting.
- Favor clarity and information hierarchy over decoration.
- Use restrained surfaces, consistent spacing, clear states, and predictable interactions.
- Use cards only for genuinely framed tools or repeated items. Do not nest cards inside cards.
- Use icons in icon buttons, tooltips for unfamiliar icons, and text labels for actions that are not immediately recognizable.
- Use clear confirmation, success, warning, empty, and error states.
- Avoid placeholder copy, lorem ipsum, fake activity, and unexplained demo controls.
- Use realistic Spanish construction-business data when a visual example is required.
- Keep primary actions visually clear without allowing every control to compete for attention.

## Color Palette

Use these project tokens as the foundation of the dark enterprise theme:

| Token | Color | Usage |
| --- | --- | --- |
| Background | `#0B0B0D` | Main application background |
| Sidebar | `#17181C` | Navigation and secondary chrome |
| Card | `#20232A` | Cards, panels, and framed tools |
| Primary | `#163DFF` | Primary actions, active states, and focus accents |
| Text | `#FFFFFF` | Primary text and headings |
| Secondary Text | `#9CA3AF` | Supporting copy and metadata |

Use opacity variants for borders and subtle states. Maintain sufficient contrast and do not introduce a competing primary color without a documented reason.

## Typography

- Use the established product stack: `Avenir Next`, `SF Pro Display`, and `Helvetica Neue` with a sans-serif fallback.
- Use tight, intentional display tracking for large headings and neutral tracking for body text.
- Use uppercase labels sparingly with small sizes and increased letter spacing.
- Establish hierarchy through size, weight, spacing, and color rather than excessive font styles.
- Do not use oversized hero typography inside compact product surfaces.
- Ensure text wraps cleanly at mobile widths and never overflows its container.

## Naming Conventions

- Use PascalCase for React component files and component names: `StatCard.tsx`, `AppShell`.
- Use camelCase for functions, variables, hooks, and object properties.
- Prefix custom hooks with `use`.
- Use descriptive names that communicate domain meaning; avoid one-letter variables.
- Use kebab-case for URL segments unless an existing route convention requires otherwise.
- Use route groups in parentheses, for example `(auth)` and `(dashboard)`.
- Name boolean values with a clear state prefix such as `is`, `has`, `can`, or `should`.
- Use named exports for reusable components. Use default exports for Next.js route entry files where the framework expects them.

## Component Rules

- Components must have a single clear responsibility.
- Define a typed props contract for reusable components.
- Keep generic primitives in `src/components/ui` and domain-specific components in the relevant domain folder.
- Prefer composition through `children`, slots, and render props over duplicated variants.
- Keep reusable components independent of a specific page whenever possible.
- Reuse `Card`, `Button`, `Input`, `StatCard`, `ChartCard`, `AppShell`, and similar primitives before creating replacements.
- Keep components accessible by default: semantic elements, labels, keyboard support, focus states, and meaningful ARIA attributes.
- Do not embed API calls, persistence, or business workflows directly in generic UI primitives.
- Avoid premature abstraction. Extract a component when it has a clear reusable responsibility or prevents meaningful duplication.

## Accessibility Rules

- Use semantic HTML landmarks, headings, lists, buttons, links, forms, and tables appropriately.
- Every form control must have a visible or programmatic label.
- Every interactive element must be keyboard accessible and have a visible focus state.
- Icon-only buttons require an accessible name through visible text, `aria-label`, or an equivalent label.
- Do not rely on color alone to communicate status or meaning.
- Maintain readable contrast for text, controls, borders, and focus indicators.
- Preserve logical focus order and support Escape to close dismissible overlays where appropriate.
- Respect reduced-motion preferences for non-essential animation.
- Use `aria-current`, `aria-expanded`, `aria-pressed`, and live regions when they accurately describe state.

## Responsive Rules

- Design mobile-first and validate at narrow mobile, tablet, laptop, and wide desktop sizes.
- Use responsive layout constraints rather than fixed widths that cause overflow.
- Keep navigation usable on mobile with a drawer or equivalent accessible pattern.
- Keep dense data scannable with appropriate wrapping, scrolling, or responsive column changes.
- Do not allow labels, buttons, badges, charts, or cards to overlap.
- Maintain stable dimensions for controls, tiles, charts, and navigation elements to prevent layout shift.
- Ensure the longest realistic label fits or wraps gracefully in every supported viewport.

## Performance Rules

- Prefer server rendering and static rendering when data freshness does not require client execution.
- Keep client component boundaries as small as practical.
- Avoid unnecessary `useMemo`, `useCallback`, or global state. Add them only when profiling or a clear dependency concern justifies them.
- Lazy-load heavy, below-the-fold, or rarely used features.
- Optimize images with `next/image` and provide dimensions or stable aspect ratios.
- Avoid large dependency additions for simple UI behavior.
- Keep list rendering keyed by stable identifiers.
- Avoid unnecessary re-renders and repeated data transformations in render paths.
- Include loading skeletons for meaningful asynchronous surfaces and prevent layout shifts.
- Do not block initial rendering with avoidable client-only work.

## Git Commit Conventions

Use Conventional Commits:

```text
type(scope): concise imperative summary
```

Allowed primary types:

- `feat`: add user-facing functionality
- `fix`: correct a defect
- `refactor`: change structure without changing behavior
- `style`: change styling or formatting only
- `perf`: improve performance
- `test`: add or change tests
- `docs`: update documentation
- `chore`: maintenance and tooling

Keep commits focused and explain breaking changes in the commit body when applicable. Do not mix unrelated features, refactors, formatting, or generated files in one commit. Never commit directly with secrets or unreviewed generated output.

## Reusable Component Policy

Before creating a new component:

1. Search `src/components` for an existing component with the same responsibility.
2. Extend an existing component when the behavior and visual contract are genuinely shared.
3. Create a new component only when it has a distinct responsibility or a stable reuse case.
4. Keep variants explicit and typed instead of branching on arbitrary string values.
5. Keep domain-specific details out of generic UI components.
6. Document non-obvious component contracts through types and concise usage examples when needed.

Duplicate markup is a maintenance risk. Shared interaction patterns, controls, cards, layouts, and feedback states should have one maintained implementation.

## Enterprise Software Standards

- Treat authorization, tenant boundaries, auditability, and data validation as first-class concerns when backend features are introduced.
- Never trust client-side validation alone. Validate all important data at the server or service boundary.
- Keep error messages actionable without exposing secrets, internal stack traces, or sensitive business data.
- Make destructive operations explicit and require appropriate confirmation.
- Design for observability: meaningful errors, structured service boundaries, and traceable user actions.
- Keep user-facing copy consistent, professional, and domain-aware.
- Prefer predictable workflows over novelty when the two conflict.
- Write focused tests for shared components, business rules, critical workflows, and regressions.
- Review security, privacy, performance, accessibility, and responsive behavior for every user-facing feature.
- Do not ship unfinished controls, dead links, fake backend flows, or demo-only content as production functionality.

## Definition Of Done

A change is complete only when it:

- Follows this document and the existing project architecture.
- Uses reusable components where reuse is warranted.
- Covers loading, empty, error, and responsive states as applicable.
- Meets accessibility and visual-quality expectations.
- Passes the available lint, type, and test checks.
- Includes concise documentation for new public behavior or architecture.
- Leaves unrelated files and behavior unchanged.
