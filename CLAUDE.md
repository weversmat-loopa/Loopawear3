# CLAUDE.md

## Project
Loopawear is an AI-powered apparel marketplace built with Next.js, TypeScript, and Tailwind CSS.

The platform should eventually allow:
- users to generate AI-based clothing designs
- users to place designs on products like T-shirts
- creators to publish designs to a marketplace
- buyers to purchase published products
- creators to have their own profile/storefront
- admin tools for moderation, credits, and platform management

This file defines how Claude should behave while working on this project.

---

## Main working rules
- Always think before making changes.
- First inspect the relevant files and understand the current structure.
- Do not make random assumptions about how the project is structured.
- Preserve clean architecture and consistency across the codebase.
- Prefer simple, maintainable solutions over clever or overly complex ones.
- Do not introduce unnecessary dependencies.
- Do not make multiple unrelated changes at once.
- When possible, make one clear change at a time.

---

## Communication style
- Be clear, practical, and structured.
- Explain what you are going to do before doing it.
- Keep suggestions concrete and relevant to the current step.
- If something is uncertain, say so clearly.
- If there is a better approach than the requested one, explain why.
- Do not overwhelm with unnecessary complexity.

---

## Workflow rules
- Before editing code, first review the relevant files.
- Before large changes, first propose a short plan.
- After making changes, summarize exactly what changed.
- Prefer incremental progress over large rewrites.
- Avoid touching files that are unrelated to the task.
- Respect the existing project structure and naming conventions.
- If a task may break existing behavior, say so first.

---

## Code quality rules
- Write clean, readable, production-minded code.
- Use TypeScript properly and avoid unnecessary `any`.
- Keep components focused and reusable.
- Prefer server-safe and modern Next.js App Router patterns.
- Keep styling clean and consistent with Tailwind CSS.
- Avoid duplication whenever reasonably possible.
- Do not leave dead code behind.
- Do not add placeholder logic unless explicitly asked.

---

## Next.js and project conventions
- Use the App Router.
- Use the `src/` structure already present in this project.
- Keep route files inside `src/app/`.
- Put reusable UI components in a logical components structure when needed.
- Keep utility logic separated from UI logic when reasonable.
- Respect the default import alias `@/*`.
- Do not restructure the entire app unless explicitly asked.

---

## Safety rules for this project
- Do not delete important code without a clear reason.
- Do not overwrite existing work blindly.
- Always check the current file contents before replacing them.
- If environment variables or secrets are needed, clearly mention them and use `.env.local`.
- Never hardcode secrets or private keys.
- Be careful with auth, database, storage, payments, and admin functionality.

---

## Git discipline
- Prefer small, meaningful changes.
- After a completed change, suggest a clear commit message.
- Keep commit scopes logical and clean.

---

## Important project direction
This project is intended to grow into a real marketplace product, not just a demo.

Priorities:
1. clean foundation
2. scalable structure
3. good UX
4. secure auth/data handling
5. maintainable code
6. clear creator/buyer/admin flows

---

## Special instruction
As the project evolves, this CLAUDE.md should also be updated when needed so it stays aligned with the real state of the project.