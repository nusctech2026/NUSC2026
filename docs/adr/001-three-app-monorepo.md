# ADR-001: One monorepo with three applications

Status: Accepted direction, inherited from Architecture v1.

Recorded: 14 September 2026. Implementation: not started.

## Context and decision

The existing club website is a root Next.js application. Club content, supporter shopping, and staff administration need distinct experiences while retaining NUSC branding and shared contracts.

Use one repository with `apps/web`, `apps/store`, and `apps/admin`, deployed independently as three Vercel projects. Web uses the root or `www` hostname, store uses `shop`, and admin uses `admin`. Exact domains and the canonical web hostname remain open.

Create shared packages only for concrete responsibilities. Packages must not import application internals or expose privileged server code to browsers. Preserve the existing eight routes, content, legacy destinations, fonts, crest, colors, and interactions during the move.

## Rationale and alternatives

A monorepo keeps branding and common rules together. Three apps accommodate separate public, customer, and staff deployments. Keeping everything in one app would reduce release coordination but would not provide the selected deployment boundaries. Separate repositories add coordination without an established need for separate repository ownership.

## Consequences and validation

Shared code does not synchronize deployed revisions. Contracts and migrations must tolerate the supported mixed-version and rollback window; affected consumers need checks when shared packages change.

Workspace tooling and platform versions remain open. npm is the current tool; pnpm/Turborepo remain proposals. I01-01/I01-06 provide version and dependency evidence; P02 establishes the workspace using I00-01's preservation baseline. No directory move or tooling installation is recorded here.

## Revisit trigger and sources

Revisit repository boundaries if independent team ownership or repository-access requirements cannot be met with current controls.

Sources: [Architecture v1: repository structure](../ARCHITECTURE.md#repository-structure), [dependency rules](../ARCHITECTURE.md#dependency-rules), and [Implementation Plan v1](../IMPLEMENTATION.md), G01 and P02.
