# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# TripChat Frontend — Build Guide

> **Backend:** Spring Boot at `http://localhost:8080` — see `API_CONTRACTS.md` for all endpoints
> **Goal:** A real-time group chat UI that connects to the existing backend

---

## Features (Phase 1)

- User registration and login
- View / create / join / leave groups
- Real-time group messaging via WebSocket (STOMP)
- Typing indicators & online presence
- Unread counts
- Infinite scroll message history (cursor-based, newest first)
- Optimistic message sending with clientId deduplication

---

## Principles

- **SOLID throughout.** We discuss where each principle applies as we build — especially Single Responsibility in components and the Open/Closed principle when extending state logic.
- **Test every integration immediately.** After wiring any API call or WebSocket subscription, verify it live (browser DevTools → Network / WS frames) before moving forward.
- **Component structure with intent.** Every component boundary is a deliberate decision — not just "split when it gets long." We discuss what warrants a new component, what stays co-located, and why.
- **Design patterns — name them, explain them.** Whenever we use a pattern (Container/Presenter, Compound Component, Custom Hook, Observer, Facade, etc.), call it out explicitly — why this pattern here, what problem it solves, and what the alternative would be.
- **State management deep dives.** Before adding state anywhere, explain why that layer and not the others. Tradeoffs between colocation, lifting state, and global stores matter.
- **Tradeoff analysis at every decision point.** No architectural choice is made without discussing at least two alternatives — library choices, rendering strategies, state placement, styling approaches, API patterns.
- **WebSocket lifecycle deep dives.** Before implementing any real-time feature, explain the STOMP handshake, subscription model, message routing, reconnection strategies, and how the client handles dropped connections.
- **Rendering model awareness.** Explain when a re-render occurs, what triggers it, and how to avoid unnecessary ones. We don't optimize blindly — we measure first.
- **Accessibility as a first-class concern.** For every interactive component, discuss the expected ARIA roles, keyboard navigation, and focus management. Don't bolt it on at the end.
- **One topic at a time.** Never discuss multiple tools, concepts, or technologies in a single response. Finish the current discussion completely — reach a decision, get agreement — before moving to the next topic.
- **No code before discussion.** Never write or edit any code until the concept, design pattern, tradeoff, and approach have been fully discussed and agreed upon. Discussion always comes first — code follows only after understanding is clear.
- **Learn by discussion.** I present structure & tradeoffs, you decide, then we build.

---

## Git Workflow

- **Always branch from `main`.** Every bug fix and feature branch must be created from the latest `main` — never from another feature branch.
  ```
  git checkout main && git pull
  git checkout -b fix/your-bug   # or feat/your-feature
  ```

---

## Approach

At each step:

1. **Discuss first (mandatory)** — component structure, state ownership, alternative libraries, design patterns, and tradeoffs. **No file is created or edited until this step is complete and agreed upon.**
2. **Why** — explain why this approach over alternatives, name the pattern being used
3. **Build** — small increments, commented code where the "why" isn't obvious (only after steps 1 & 2 are done)
4. **Verify** — open the browser, confirm behavior in DevTools (Network, WS, Console), test edge cases
5. **Reflect** — summarize what was learned (pattern, rendering behavior, tradeoff, or frontend concept)

Steps emerge from the conversation. We go one at a time.

---

## Agreed Decisions

| Concern              | Decision                             | Rejected                             | Reason                                                                                                                                       |
| -------------------- | ------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework            | React 18                             | Vue, Svelte, Angular                 | Largest ecosystem, concurrent rendering, React Native skill transfer if mobile comes later                                                   |
| Build tool           | Vite                                 | CRA, Webpack                         | Native ESM, instant HMR, no config overhead                                                                                                  |
| Language             | TypeScript                           | JavaScript                           | Type-safe API boundaries, null safety for nullable fields (senderId, senderUsername), compile-time contract enforcement                      |
| Styling              | Tailwind CSS v4                      | CSS Modules, Styled Components, Tailwind v3 | Zero runtime cost, CSS-first config via @theme, no tailwind.config.js, faster builds         |
| Global client state  | Zustand                              | Redux Toolkit, React Context         | Selector-based subscriptions (no unnecessary re-renders), no Provider wrapping, works outside React (WebSocket handlers, Axios interceptors) |
| Server state         | TanStack Query                       | Manual fetch + Zustand               | Automatic caching, background refetch, request deduplication, native cursor-based pagination via useInfiniteQuery                            |
| HTTP client          | Axios                                | Fetch API                            | Interceptors for JWT injection and 401 → logout in one place, automatic error throwing on 4xx/5xx                                            |
| Routing              | React Router v6                      | TanStack Router                      | Battle-tested, nested routes for ProtectedRoute wrapper, useNavigate for post-login and 401 redirects                                        |
| WebSocket            | @stomp/stompjs + sockjs-client       | Raw WebSocket, react-use-websocket   | Backend mandates STOMP protocol over SockJS — only option that handles both natively                                                         |
| Forms                | React Hook Form + Zod                | Controlled inputs + useState, Formik | Uncontrolled inputs = no re-render on every keystroke, Zod schema is both validation and TypeScript type                                     |
| Testing              | Vitest + React Testing Library + MSW | Jest                                 | Vite-native runner, RTL tests user behavior not internals, MSW mocks network at transport level                                              |
| Linting & Formatting | ESLint + Prettier                    | Biome                                | Vite react-ts template sets this up out of the box, Biome's React Hooks plugin support is incomplete                                         |
| Project Structure    | Feature-based                        | Layer-based                          | High cohesion per domain, one folder per feature, shared-only code in top-level directories                                                  |

---

## Project Structure

```
src/
├── features/
│   ├── auth/
│   │   ├── components/    # LoginForm, RegisterForm
│   │   ├── hooks/         # useLogin, useRegister
│   │   ├── api.ts         # auth API calls
│   │   └── types.ts       # auth-specific types
│   ├── groups/
│   │   ├── components/    # GroupCard, GroupList, CreateGroupModal
│   │   ├── hooks/         # useGroups, useCreateGroup
│   │   └── api.ts
│   └── chat/
│       ├── components/    # MessageBubble, MessageInput, TypingIndicator
│       ├── hooks/         # useMessages, useTyping, useWebSocket
│       └── api.ts
├── components/            # Truly shared UI primitives only (Button, Input, Modal)
├── store/                 # Zustand stores (cross-feature global state)
├── types/                 # Shared types mirroring API_CONTRACTS.md shapes
├── lib/                   # Axios instance, queryClient, STOMP client setup
└── main.tsx
```

**Rule:** if a file is used by only one feature → it lives inside that feature folder. If it is used by two or more features → it moves to a top-level directory.
