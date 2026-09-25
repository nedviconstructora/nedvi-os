# NEDVI OS Development Rules

This document defines how every future feature must be planned, implemented, reviewed, and released. All feature work must follow this workflow together with [AGENTS.md](AGENTS.md), [ARCHITECTURE.md](ARCHITECTURE.md), and [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md).

## Development Workflow

Every feature must pass through the following steps. The work is not complete until the applicable steps have been addressed.

### 1. Understand the Feature

- Clarify the user problem, expected outcome, users, permissions, and success criteria.
- Identify related modules, records, workflows, and existing components.
- Search the codebase before creating new abstractions.
- Identify loading, empty, error, permission, and offline states where relevant.
- Confirm the feature does not conflict with the product requirements or architecture.

### 2. Update Architecture If Needed

- Review [ARCHITECTURE.md](ARCHITECTURE.md) before changing data, services, APIs, authentication, storage, or deployment.
- Update the architecture documentation when the feature introduces a new boundary, dependency, data flow, integration, or operational requirement.
- Record significant technical decisions and their tradeoffs.
- Do not introduce a new architectural pattern only for one isolated screen.

### 3. Create Reusable Components First

- Identify reusable UI primitives, layout patterns, domain widgets, service contracts, types, and hooks before building the feature.
- Extend an existing component when its responsibility and visual contract are shared.
- Create new components at the narrowest appropriate ownership level.
- Define typed props and explicit component contracts.
- Keep generic components independent of backend and domain-specific business logic.

### 4. Build the Feature

- Implement the feature within the existing App Router and domain boundaries.
- Prefer Server Components for data reads and static composition.
- Keep Client Components limited to interactivity, browser APIs, local state, real-time subscriptions, or offline behavior.
- Put business rules in services or domain modules, not in route files or visual components.
- Use centralized validation and typed data contracts.
- Do not create fake backend flows, fake success messages, or demo-only controls in production features.

### 5. Responsive

- Implement mobile-first layouts and validate mobile, tablet, desktop, and wide-screen behavior.
- Keep controls, tables, charts, navigation, and text within their containers at every supported width.
- Use responsive grids, wrapping, scrolling, or alternate layouts instead of fixed-width overflow.
- Ensure touch targets are usable on mobile devices.
- Provide an accessible mobile navigation pattern for authenticated application surfaces.

### 6. Accessibility

- Use semantic HTML and meaningful landmarks.
- Provide labels for every form control.
- Ensure all interactions work with keyboard navigation.
- Provide visible focus indicators.
- Give icon-only controls an accessible name.
- Do not communicate important information through color alone.
- Support reduced motion for non-essential animations.
- Use appropriate ARIA state and relationship attributes only when native HTML is insufficient.

### 7. Performance Optimization

- Keep Server Components as the default.
- Keep client boundaries and JavaScript bundles small.
- Avoid unnecessary global state, effects, memoization, and dependency additions.
- Optimize images and use stable dimensions to prevent layout shift.
- Paginate or virtualize large collections.
- Move slow, retryable, or resource-intensive work to background jobs.
- Measure or explain performance-sensitive decisions rather than optimizing by habit.

### 8. Error Handling

- Validate all external input at the server or service boundary.
- Define predictable error states for network failures, authorization failures, validation failures, conflicts, provider failures, and unexpected errors.
- Show actionable user-facing messages without exposing secrets, internal traces, or sensitive data.
- Log failures with enough context for diagnosis while redacting private information.
- Make retryable operations safe to retry and use idempotency where required.
- Do not silently discard user work.

### 9. Loading States

- Add loading states for asynchronous or data-driven content.
- Prefer route-level `loading.tsx` and Suspense boundaries for route and section loading.
- Use skeletons that preserve the final layout and avoid cumulative layout shift.
- Indicate progress for uploads, imports, exports, long reports, and other extended operations.
- Keep loading states calm and informative; do not block unrelated content unnecessarily.

### 10. Empty States

- Define an intentional empty state for every collection, dashboard, report, search, and inbox surface.
- Explain what is empty and why it matters.
- Provide a relevant next action when the user has permission to create or resolve the empty state.
- Distinguish between no data, no search results, no permission, and data still loading.
- Never use lorem ipsum or meaningless placeholder content.

### 11. Documentation

- Update the relevant requirements, architecture, or feature documentation when behavior or boundaries change.
- Document public service contracts, API behavior, configuration, migrations, and integration assumptions.
- Keep user-facing copy and operational instructions accurate.
- Add concise comments only for non-obvious decisions.
- Include migration, rollout, rollback, and support notes for operationally significant changes.

### 12. Unit Test Ready

- Design business logic, validation, transformations, and state transitions so they can be tested independently.
- Add unit tests for important rules, calculations, permissions, and failure paths.
- Add component tests for shared interactive components and critical user workflows.
- Add integration or end-to-end coverage for cross-module and high-risk flows.
- Do not rely only on visual inspection for critical behavior.
- Use deterministic test data and avoid tests that depend on production services.

### 13. Production Ready

Before completion, confirm that the feature is secure, responsive, accessible, observable, documented, and consistent with existing patterns.

- No known type, lint, test, or build errors.
- No secrets or unsafe debug output.
- Permissions enforced on the backend and reflected correctly in the UI.
- Loading, empty, error, and permission states handled.
- Database changes migrated and reversible where applicable.
- External calls timeout, retry, and fail safely.
- Logs, metrics, and audit events exist where the risk or workflow requires them.
- The feature can be released, monitored, and rolled back without guesswork.

## Component Rules

- Never duplicate code when a shared abstraction is appropriate.
- Always reuse existing components before creating new ones.
- Prefer composition over inheritance.
- Keep components under 200 lines whenever practical. Split larger components by responsibility rather than arbitrarily.
- Use Server Components when possible.
- Use Client Components only when necessary for interaction, browser APIs, local client state, real-time behavior, or offline behavior.
- Keep components focused on one responsibility.
- Define explicit, typed props for reusable components.
- Keep visual primitives free of API calls and business rules.
- Place shared primitives in `src/components/ui` and domain components in the relevant domain folder.
- Use accessible semantic elements and maintain visible focus states.
- Avoid adding one-off variants that make a shared component harder to understand.

## API Rules

- Never call APIs directly from UI components.
- Use services as the only application boundary for external APIs, persistence, email, storage, search, and AI providers.
- Centralize requests, authentication headers, retries, timeouts, and error normalization.
- Use typed request and response contracts.
- Validate all request input and response data at the boundary.
- Enforce tenant scope and permissions in the backend service, never only in the UI.
- Use consistent status codes and error envelopes.
- Add pagination and filtering to collection endpoints.
- Use idempotency keys for retryable mutations such as payments, purchasing, uploads, and external sends.
- Never expose provider credentials, database details, internal stack traces, or unauthorized fields.
- Document externally consumed API changes and preserve backwards compatibility through versioning.

## Folder Rules

Every feature must have a clear domain folder and, when applicable, the following internal boundaries:

```text
src/features/<feature>/
  components/
  hooks/
  services/
  types/
  utils/
```

The boundaries have these responsibilities:

- `components`: Feature-specific presentation and composition.
- `hooks`: Feature-specific client hooks and interaction state.
- `services`: Feature use cases, data access, integrations, and server-side operations.
- `types`: Feature contracts, domain types, and schemas.
- `utils`: Pure feature helpers that do not perform I/O.

Additional folder rules:

- Shared UI primitives belong in `src/components/ui`.
- Application chrome belongs in `src/components/layout`.
- Route composition belongs in `src/app`.
- Shared hooks belong in `src/hooks`.
- Shared services belong in `src/services`.
- Framework-agnostic shared helpers belong in `src/lib`.
- Shared client state belongs in `src/store` only when local or URL state is insufficient.
- Do not place business logic in page files, generic UI components, or route handlers.
- Do not create a miscellaneous `helpers`, `common`, or `utils` folder without a clear ownership boundary.

## Code Review Checklist

Every feature review must evaluate the following:

### Accessibility

- Are semantics, labels, keyboard behavior, focus states, contrast, and screen-reader names correct?
- Are loading, error, empty, and permission states understandable without relying only on color?

### Performance

- Is the correct rendering model used?
- Are client boundaries, data requests, dependencies, and list rendering justified?
- Is the feature free of avoidable layout shift and unnecessary work?

### Responsive

- Does it work at mobile, tablet, desktop, and wide-screen sizes?
- Do text, controls, charts, tables, and cards remain inside their containers?

### Dark Theme

- Does the feature use the NEDVI OS dark palette and preserve readable contrast?
- Are hover, active, focus, disabled, selected, loading, warning, and error states visible in dark mode?

### No Duplicated Code

- Were existing components and utilities searched first?
- Is shared behavior implemented once with a clear ownership boundary?

### Type Safety

- Are public props, service requests, responses, errors, and state transitions typed?
- Is `any` avoided and external data validated?

### Reusable

- Is the component composed from existing primitives where appropriate?
- Are variants explicit, minimal, and understandable?
- Could the component be reused without importing page-specific state or backend logic?

### Production Ready

- Are security, permissions, failure handling, loading states, empty states, logging, tests, documentation, and rollback implications addressed?
- Does the change follow [AGENTS.md](AGENTS.md), [ARCHITECTURE.md](ARCHITECTURE.md), and [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md)?

## Mandatory Rule

Future tasks must always follow this workflow. When a task cannot satisfy a rule, the deviation must be explicit, justified, and documented before the work is considered complete.
