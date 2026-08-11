# Kellogg Recruiting Copilot

Build a web app called Kellogg Recruiting Copilot for a small cohort of
~30 Kellogg MBA graduates job-hunting together.

v1 scope:
- Sign-up/login restricted to Kellogg email domains only
  (@u.northwestern.edu or @kelloggalumni.northwestern.edu) — reject any
  other domain at signup.
- After signing up, the user sets a target function (free text) and
  target level (free text) as their preferences.
- A main feed page showing job postings: company, title, location, days
  since posted, priority score, and two aggregate signals shown as counts
  only, never names: "N people in the network have applied" and "alumni
  overlap exists at this company in this function."
- Each posting has an "I applied" button that logs the application and
  increments the shared counter (excluding the viewer's own application
  from the count shown back to them).
- A personal dashboard showing the user's own logged applications and
  counts.

Design: clean, minimal, mobile-friendly.

Important: enable Cloud for auth and database, but do NOT auto-generate
the database schema yet — I will provide the exact schema and RLS
policies via a SQL migration afterward. For now, scaffold the UI screens
(signup, preferences, feed with an Apply button, dashboard) with
placeholder/mock data, plus basic Kellogg-domain-gated auth.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kellogg-job-compass.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ce67b878-6b3a-4f36-b81e-5354711994f2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
