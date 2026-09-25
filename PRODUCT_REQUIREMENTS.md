# NEDVI OS Product Requirements

This document is the product source of truth for NEDVI OS. Product, design, engineering, and operational decisions must align with these requirements. Any intentional deviation must be documented as a product or technical decision.

## Product Vision

### Definition

NEDVI OS is an enterprise operating system for construction companies. It unifies the operational, commercial, financial, and administrative work required to plan, build, and deliver construction projects.

### Main Objective

The main objective is to give construction companies one reliable system for running the company from opportunity to completion. NEDVI OS must connect people, projects, clients, worksites, documents, money, materials, communications, and decisions so teams spend less time searching, duplicating work, and reconciling disconnected tools.

The product must turn business activity into clear, actionable information:

- Managers should understand company health and project risk quickly.
- Project teams should coordinate work, documents, tasks, and site activity in one place.
- Commercial teams should manage clients, quotes, follow-ups, and revenue without losing context.
- Administrative teams should maintain accurate records, permissions, and audit history.
- Executives should have trustworthy reports for decisions and planning.

### Target Users

NEDVI OS serves construction companies of different sizes, with particular value for organizations managing multiple projects, teams, suppliers, sites, and clients at the same time.

Primary users include:

- Company owners and executives who need a complete operating view.
- Project managers responsible for schedules, budgets, risks, and delivery.
- Engineers and architects coordinating technical work and site execution.
- Sales and marketing teams managing opportunities and client relationships.
- Warehouse, purchasing, and finance teams managing resources and costs.
- Field teams that need dependable mobile access in active worksites.
- Clients who need transparent, controlled access to relevant project information.

### Core Philosophy

NEDVI OS must be:

- **Operationally useful:** Every screen should help a user understand, decide, or act.
- **Connected:** Information should retain its context across modules instead of being re-entered or isolated.
- **Trustworthy:** Data, permissions, audit history, and reports must be clear and dependable.
- **Calm under complexity:** The interface should make complex operations feel organized and manageable.
- **Action-oriented:** Important exceptions, deadlines, risks, and next steps should be visible.
- **Enterprise-ready:** The platform must support secure growth, multiple teams, multiple projects, and increasingly complex workflows.
- **Human-centered:** The system should respect the time, attention, and working conditions of both office and field teams.

## Modules

Modules should share identity, permissions, search, notifications, auditability, and consistent design patterns. Each module must preserve links to related records and provide clear ownership of its data.

### Dashboard

Provide role-aware operational summaries, KPIs, alerts, recent activity, upcoming work, project health, and quick actions. The dashboard should help users understand what needs attention without replacing detailed workflows.

### CRM

Manage the commercial pipeline, opportunities, contacts, follow-ups, communication history, and conversion from prospect to client. CRM records should connect directly to quotes, projects, and revenue.

### Clients

Maintain complete client profiles, contacts, addresses, contracts, project relationships, communications, documents, and account history. Support individual and company clients where appropriate.

### Projects

Manage project lifecycle, scope, budgets, schedules, teams, milestones, risks, documents, communications, and financial status. Projects are a central context shared by other modules.

### Construction Sites

Track worksites, progress, daily logs, incidents, site observations, materials, photos, weather, personnel, and field tasks. Site workflows must support mobile use and unreliable connectivity.

### Quotations

Create, version, review, approve, send, and track quotations. Support line items, materials, labor, taxes, margins, discounts, attachments, expiration dates, and conversion into a project or order.

### Inventory

Track materials, equipment, stock levels, locations, reservations, movements, consumption, adjustments, and reorder thresholds. Inventory must connect with projects, worksites, suppliers, and purchasing.

### Suppliers

Maintain supplier profiles, contacts, terms, categories, documents, performance history, and relationships to inventory and purchasing activity.

### Purchasing

Manage purchase requests, purchase orders, approvals, supplier communications, deliveries, invoices, and reconciliation with projects and inventory.

### Human Resources

Manage employees, roles, teams, assignments, availability, documents, time, certifications, and project participation while respecting privacy and access boundaries.

### Accounting

Support financial records, budgets, project costs, invoices, payments, expenses, taxes, accounts receivable, accounts payable, and reporting. Accounting workflows must maintain traceability and should integrate with external accounting systems where needed.

### Calendar

Provide shared and personal views for meetings, site visits, deadlines, tasks, deliveries, inspections, and milestones. Calendar events must link to relevant projects, clients, or records.

### Documents

Provide centralized, permission-aware document storage with folders, versions, metadata, previews, approvals, and relationships to projects, clients, suppliers, and workflows.

### Emails

Provide an integrated view of relevant email conversations and allow messages to be associated with clients, projects, quotes, suppliers, and tasks. Preserve message context and permissions.

### Reports

Provide configurable operational, commercial, project, inventory, purchasing, HR, and financial reports. Reports must show data freshness, scope, filters, and export options.

### Notifications

Deliver actionable in-app and external notifications for assignments, approvals, deadlines, status changes, exceptions, mentions, and system events. Users must be able to control notification preferences.

### AI Assistant Coral

Coral is the NEDVI OS AI assistant. Coral should help users find information, summarize project status, surface risks, draft communications, answer questions over permitted company data, and guide users through workflows.

Coral must respect user permissions, identify the source or context of important answers, communicate uncertainty, and never make unreviewed high-impact decisions on behalf of a user.

### Administration

Provide organization-level management for companies, tenants, users, teams, roles, permissions, integrations, billing, security policies, audit access, and system configuration.

### Settings

Provide personal and organization settings for language, time zone, notifications, appearance, profile information, security, integrations, and preferences.

## User Roles

Roles define default responsibilities and access patterns. Permissions must remain explicit, configurable, auditable, and scoped to the organization, project, module, record, or action as appropriate.

### Administrator

Owns organization configuration, users, roles, permissions, integrations, security policies, and audit access. Administrators can manage all company data according to the organization policy.

### Project Manager

Owns project planning, execution, budgets, schedules, teams, risks, documents, client communication, and project reporting.

### Engineer

Works with technical project information, plans, specifications, site progress, inspections, issues, measurements, and engineering documentation.

### Architect

Works with design information, plans, revisions, approvals, specifications, visual documentation, and coordination with clients and project teams.

### Sales

Manages leads, opportunities, clients, follow-ups, quotations, commercial activity, and pipeline reporting.

### Marketing

Manages campaigns, content, lead generation, communications, customer insights, and marketing reporting while respecting CRM permissions.

### Warehouse

Manages inventory, stock movements, materials, equipment, deliveries, reservations, and warehouse operations.

### Accountant

Manages financial records, invoices, expenses, payments, budgets, accounting reports, and financial reconciliation.

### Client

Has controlled access to their own organization, projects, shared documents, approved updates, communications, and relevant project progress.

## Global Features

These capabilities are platform-wide requirements and should be designed as shared foundations rather than duplicated independently in each module.

### Authentication

Support secure sign-in, sign-out, password recovery, session management, multi-factor authentication readiness, and organization-aware identity.

### Permissions

Support role-based and resource-scoped permissions. Permission checks must apply in the UI, server actions, APIs, services, exports, files, and AI responses.

### Notifications

Support in-app notifications, email notifications, configurable preferences, unread state, priority, links to source records, and reliable delivery status.

### Audit Logs

Record meaningful security, data, permission, approval, and workflow events with actor, timestamp, target, action, and relevant context. Audit logs must be protected from unauthorized modification.

### Dark Theme

Provide a polished dark theme as the primary product experience. Colors, contrast, focus states, charts, statuses, documents, and overlays must remain legible in dark mode.

### File Uploads

Support secure uploads with size and type validation, progress state, retry behavior, previews where applicable, metadata, access control, and virus or content scanning integration readiness.

### Email Integration

Support connected email providers, sending and receiving where authorized, conversation association, templates, attachments, delivery state, and permission-aware search.

### AI

Provide permission-aware AI capabilities through Coral and future AI workflows. AI output must be reviewable, explainable where practical, and clearly distinguished from verified system data.

### Search

Provide fast global search across permitted clients, projects, people, documents, quotes, emails, inventory, and activities. Search should support filters, relevance, recent searches, and deep links.

### Reports

Support saved reports, filters, date ranges, grouping, role-aware data access, exports, scheduled delivery readiness, and clear data freshness indicators.

### Analytics

Provide product and business analytics for operational health, project performance, commercial conversion, resource use, financial outcomes, and user adoption. Analytics must respect privacy and permissions.

### Mobile Support

Provide responsive workflows for mobile browsers and a path toward dedicated mobile experiences. Field-critical actions must remain practical on small screens and touch devices.

### Offline Support

Support offline-ready field workflows where the use case requires it. Offline data must show its sync state, resolve conflicts safely, and never silently discard user work.

### QR Codes

Support QR code generation and scanning for projects, sites, inventory, equipment, documents, and other physical-to-digital workflows.

### PDF Generator

Support reliable PDF generation for quotations, reports, invoices, project documents, site logs, and client-facing exports with consistent branding and traceable versions.

### Cloud Storage

Support secure, scalable cloud storage for files and documents with organization boundaries, retention policies, versioning, metadata, and provider abstraction.

### Real-time Updates

Provide real-time or near-real-time updates for collaboration-critical records, notifications, statuses, comments, approvals, and field activity. The interface must communicate connection and sync state when relevant.

## Future Vision

NEDVI OS must become the operating system of the company.

The long-term product should become the trusted system where a construction company plans its work, coordinates its people, manages its money, understands its performance, communicates with clients, and improves its operations. NEDVI OS should connect the strategic view of leadership with the practical reality of the worksite without creating unnecessary administrative overhead.

Future development must always follow this document. New features should strengthen the shared operating model, preserve enterprise trust, and move the company toward one connected, intelligent, and dependable system of work.
