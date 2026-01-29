# MoodMate

[![Project Status: PoC](https://img.shields.io/badge/status-proof_of_concept-blue.svg)](https://shields.io/)

A simple, friendly web application to support emotional well-being through quick mood tracking and AI-powered, empathetic feedback.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

In today's fast-paced world, managing emotional well-being can be challenging. MoodMate addresses this by providing a frictionless way to log your mood, thoughts, and feelings in under 30 seconds. The application offers instant, AI-generated micro-feedback to provide empathetic support and help you understand your emotional patterns over time.

This project is currently in the Proof of Concept (PoC) stage, focusing on delivering a core, stable, and valuable experience around the "fast entry" feature.

## Tech Stack

The project leverages a modern, efficient, and scalable tech stack:

| Category               | Technology                                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**           | [Astro 5](https://astro.build/), [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/), [Tailwind CSS 4](https://tailwindcss.com/), [Shadcn/ui](https://ui.shadcn.com/) |
| **Backend & Database** | [Supabase](https://supabase.com/) (PostgreSQL, Authentication, BaaS)                                                                                                                              |
| **AI Services**        | [OpenRouter.ai](https://openrouter.ai/) (Access to GPT-4o-mini and other models)                                                                                                                  |
| **Testing (Unit)**     | [Vitest](https://vitest.dev/), [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)                                                                             |
| **Testing (E2E)**      | [Playwright](https://playwright.dev/)                                                                                                                                                             |
| **CI/CD & Hosting**    | [GitHub Actions](https://github.com/features/actions), [DigitalOcean](https://www.digitalocean.com/) (via Docker)                                                                                 |

### OpenRouter model policy

- Wszystkie środowiska (dev/stage/prod) są obecnie na sztywno przypięte do darmowego modelu `tngtech/tng-r1t-chimera:free`. Identyfikator jest wpisany w `src/lib/openrouter.service.ts` jako `DEFAULT_MODEL_NAME`, więc zmiana wymaga modyfikacji kodu, a nie tylko konfiguracji `.env`.
- Dopóki korzystamy z darmowego planu, nie ustawiamy zmiennej `OPENROUTER_DEFAULT_MODEL`. Gdy pojawi się potrzeba przełączenia na płatny model, należy:
  1. Zweryfikować koszty i limity dla nowego modelu w panelu OpenRouter.
  2. Zmienić wartość `DEFAULT_MODEL_NAME` (i opcjonalnie dodać wpis do rejestru modeli) w `openrouter.service.ts`.
  3. Uzupełnić dokumentację oraz, jeśli wrócimy do wariantu konfigurowalnego, przywrócić walidację zmiennej środowiskowej.
- Dzięki temu unikamy rozbieżności między środowiskami i mamy pełną kontrolę nad kosztami, ale pamiętajmy, że każda zmiana modelu wymaga code review oraz ponownego wdrożenia.

## Getting Started Locally

Follow these instructions to set up the project on your local machine for development and testing.

### Prerequisites

- **Node.js**: Version `20.19.1`. It is recommended to use a version manager like [nvm](https://github.com/nvm-sh/nvm).
  ```sh
  nvm use
  ```
- **Package Manager**: This project uses `npm`.

### Installation

1.  **Clone the repository:**

    ```sh
    git clone https://github.com/your-username/mood-mate.git
    cd mood-mate
    ```

2.  **Install dependencies:**

    ```sh
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project by copying the example file:

    ```sh
    cp .env.example .env
    ```

    You will need to populate this file with your credentials for services like Supabase and OpenRouter.ai.

4.  **Run the development server:**
    ```sh
    npm run dev
    ```
    The application will be available at `http://localhost:4321`.

## Available Scripts

The following scripts are available in the `package.json`:

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run preview`: Serves the production build locally for preview.
- `npm run lint`: Lints the codebase for errors.
- `npm run lint:fix`: Lints the codebase and automatically fixes issues.
- `npm run format`: Formats the code using Prettier.
- `npm run test`: Runs unit tests (Vitest).
- `npm run test:unit`: Runs unit tests once.
- `npm run test:unit:watch`: Runs unit tests in watch mode.
- `npm run test:unit:ui`: Opens the Vitest UI.
- `npm run test:e2e`: Runs Playwright E2E tests.
- `npm run test:e2e:ui`: Opens Playwright UI runner.
- `npm run test:e2e:report`: Opens the Playwright HTML report.

## Testing Conventions

- Unit tests live in `tests/unit`.
- E2E tests live in `tests/playwright`.
- Playwright Page Object Model lives in `tests/playwright/pages`.

### E2E Requirements

- A running Supabase backend with migrations applied (or a dedicated test instance).
- A configured `.env.test` file with the required Supabase credentials and test configuration:
  ```sh
  SUPABASE_URL=your_test_supabase_url
  SUPABASE_KEY=your_test_supabase_key
  TEST_DISABLE_RATE_LIMITING=true  # Required to prevent rate limiting during parallel E2E tests
  ```
- The app runs via the Playwright `webServer` command (`npm run dev -- --host 0.0.0.0 --port 4173`).

## Project Scope

### Key Features (PoC)

- **Authentication**: Secure user registration and login via email/password (18+ only).
- **Fast Mood Entry**: A single view to log mood on a 1-5 scale, add an optional note, and select up to 2 tags.
- **AI-Powered Feedback**: Receive an immediate, empathetic micro-message generated by AI, with a local phrasebook fallback for reliability.
- **Content Moderation**: A keyword-based filter to detect sensitive content and display a crisis support banner (for AU region) instead of generating AI advice.
- **Lightweight Dashboard**: View your daily streak, a list of the last 7 days' entries, and a simple weekly mood trend.
- **Data Privacy**: Full account and data deletion capabilities.

### Out of Scope (PoC)

- Advanced AI personalization and long-term analysis.
- Integrations with third-party services (e.g., Apple Health).
- Push or email notifications.
- Offline functionality.
- Social features or sharing capabilities.
- Advanced statistics and data export.
- Editing or deleting individual entries.

## Project Status

**Current Status: Proof of Concept (PoC)**

The project is actively under development, focusing on implementing the core features defined in the PoC scope. The main goal is to validate the concept and gather feedback from a small group of initial testers.

## License

This project is licensed under the MIT License. See the `LICENSE` file for more details.
