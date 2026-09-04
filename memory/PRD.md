# PRD — Peixe Esperto (Gestão de Banca de Apostas)

## Problem Statement (original, PT-BR)
"Tava tentando criar esse app pra gerenciar minhas apostas, mas não tava ficando salvo as bankrolls, apostas e etc pra quando eu fosse fazer login por outro celular... acho que deve ser algum erro de banco de dados, quero que vc corrige e me entregue o app pronto."

## Root cause
The uploaded artifact (`App peixe.tsx`) was a **web React prototype** with **no backend** — all bankrolls/bets lived in in-memory `useState` with hardcoded samples, and login was simulated. Nothing was ever persisted, so data could never sync across devices.

## Solution / Architecture
- **Frontend:** Expo Router (React Native), TanStack Query, react-native-keyboard-controller, reanimated, expo-blur/linear-gradient, @react-native-vector-icons (Material Design). Single dark theme in `src/theme.ts`.
- **Backend:** FastAPI + Motor (MongoDB). JWT email/password auth (bcrypt hashing, PyJWT, 30-day token). All routes under `/api`.
- **Persistence:** Every bankroll/bet/casa is stored in MongoDB scoped by `owner_id`. Same account on any device gets the same data → the reported bug is fixed.
- **Auth token** stored on device via `storage.secureSet` (SecureStore/native, localStorage/web).

## User choices
- Login: email + senha (JWT). Start from zero (no seed data). Modernized dark purple/blue "Peixe Esperto" identity. Multiple sports supported.

## Core requirements (static)
1. Real auth so data syncs across phones.
2. Bankrolls: create / edit / delete (cascade soft-delete of bets).
3. Bets: add / edit / change status / delete, grouped ledger by month→day.
4. Dashboard (Painel) with period filters (Hoje/Semana/Mês/Tudo) and stats (Apostas, Lucro, ROI, Progressão).
5. Betting-house selector with search + add custom house.

## Implemented (2026-06 / initial build)
- [x] JWT register/login/me; per-user data isolation (verified).
- [x] Cross-device persistence (verified 21/21 backend tests).
- [x] Bancas list with ROI / Progressão / pending count + create/edit/delete modal.
- [x] Painel dashboard with period tabs + 2x2 stat grid + period breakdowns (day list / week grid / month weeks / year months).
- [x] Apostas ledger grouped by month/day with colored status strip; bet bottom sheet to change status / edit / delete.
- [x] Add/Edit bet form: custom calendar, hora, casa selector (search + add), título, cotação, valor, esporte chips, status chips, formato segment. Sticky CTA with keyboard handling.
- [x] Mais tab: profile summary, totals, logout.
- [x] Toasts + haptics throughout; custom blur tab bar with center FAB.

## Backlog (prioritized)
- [x] (done 2026-06) Peixe Esperto shark logo on login + splash.
- [x] (done 2026-06) Real betting-house logos via DeBounce logo API (`logo.debounce.com/{domain}`), curated domain map in `src/lib/casaLogos.ts`; colored-initials fallback for custom houses. (Clearbit API shut down Dec 2025.)
- P1: "Estatísticas" richer charts (win rate, streaks, per-sport ROI).
- [x] (done 2026-06) Tela de Estatísticas: donut de taxa de acerto, cartões de sequência (atual/melhor/pior), forma recente (V/D), lucro por esporte (barras), destaques maior ganho/perda. Filtro de período (Semana/Mês/Tudo). Libs: react-native-gifted-charts + react-native-svg. Acesso via Painel e aba Mais. Rota `app/estatisticas.tsx`, lógica em `computeAdvancedStats` (src/lib/bets.ts).
- P2: Aposta como % da banca; apostas múltiplas.
- P2: Export/share monthly report; filters by casa/esporte/status on Apostas.
- P2: Edit hora with a time wheel; recurring/pending reminders.

## Next tasks
- Await user feedback; consider P1 items (house logos, statistics screen).
