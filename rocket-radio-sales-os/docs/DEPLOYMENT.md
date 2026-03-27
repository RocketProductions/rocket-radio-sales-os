# Deployment Guide

Rocket Radio Sales OS uses Vercel for hosting the Next.js application and a managed database (e.g. PostgreSQL on Neon or PlanetScale) for multi‑tenant data. This guide explains how to connect the GitHub repository to Vercel and set up preview and production environments.

## 1. Prerequisites

- A GitHub repository containing this project.
- A Vercel account linked to your GitHub account.
- Database credentials for development, preview and production.

## 2. Import the Project

1. Sign in to [Vercel](https://vercel.com) and click **New Project**.
2. Select your GitHub repository (`RocketProductions/rocket-radio-sales-os` or your fork) and click **Import**.
3. Vercel will detect the Next.js framework automatically.

## 3. Configure Environment Variables

Add the following variables for each environment (Preview and Production):

- `OPENAI_API_KEY`: your OpenAI API key.
- `OPENAI_MODEL`: e.g. `gpt-5.2-codex`.
- `DATABASE_URL`: connection string for your PostgreSQL database.
- Any other provider secrets (e.g. email, analytics).

Vercel allows you to specify different values for **Development**, **Preview** and **Production**.

## 4. Preview Deployments

Enable **Preview Deployments** so every branch and pull request automatically gets a unique URL. This allows the QA agent and stakeholders to review features before they reach production.

## 5. Production Deployments

By default, Vercel will deploy the `main` branch to production. You can change this in the **Git Integration** settings. To promote a preview deployment to production manually, click **Promote** on the desired build.

## 6. Continuous Integration

The repository includes a `.github/workflows/ci.yml` file that runs linting, type checking, tests and verification scripts on every push. Ensure that CI passes before merging to `main`. Failed checks will prevent Vercel from deploying.

## 7. Rollback Plan

Vercel keeps a history of deployments. If a production deploy fails or introduces a bug, you can roll back to a previous deployment via the Vercel dashboard.

For more on multi‑agent QA and smoke tests, see `AGENT-TASKS.md`. For architecture details, see `ARCHITECTURE.md`.