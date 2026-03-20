Sdelka portfolio — React 19 + Vite 8 + TypeScript + Tailwind v4 SPA.

## Project map

- `src/` — app source (components, hooks, assets)
- `scripts/` — automation scripts (ralph.sh)
- `public/` — static assets

## Dependencies

@package.json

## Important Notes

- Use `react-best-practices` skill when writing or reviewing React code.

<important if="you have finished making code changes">

- Run `pnpm typecheck`, `pnpm lint`, and `pnpm knip` to catch type errors, lint issues, and dead code
- Update related tests for new values/behavior; check for hardcoded values in tests
- Clean up all references when removing enums/constants
</important>

<important if="you are creating new modules, files, or designing component boundaries">

- Prefer **deep modules** — small interface hiding large implementation. Friction signals: too many small files for one concept, interface ≈ implementation, tight coupling across seams
- Handle deps by category: in-process (merge, test directly) · local-substitutable (test with stand-in) · remote-owned (ports & adapters) · true-external (mock at boundary)
- Test at module boundaries, not internals — don't layer boundary tests with shallow unit tests
</important>

<important if="you are writing or modifying React components that use state, side effects, or data fetching">

Avoid `useEffect` in components:

1. **Derive state inline** — don't `useEffect(() => setX(f(y)), [y])`
2. **Use data-fetching libraries** (`useQuery`) — never `fetch` + `setState` in an effect
3. **Event handlers, not effects** — user-triggered work goes in handlers
4. **`useMountEffect` for one-time external sync** — wrap `useEffect(cb, [])` in a named hook. Valid for DOM integration, third-party widgets, browser API subscriptions
5. **Reset with `key`** — `<Component key={id} />` instead of resetting state in an effect

Smell tests (don't write the effect):
- State mirrors other state/props
- `fetch()` then `setState()` in an effect
- State used as a flag so an effect can do the real work
- Effect only resets state when a prop changes
</important>

<important if="you are writing or modifying Tailwind classes, CSS, or theme configuration">

Tailwind v4 — CSS-first config:
- `@theme` blocks, not `tailwind.config.ts`
- `@import "tailwindcss"`, not `@tailwind` directives
- OKLCH colors, semantic tokens (`bg-primary` not `bg-blue-500`)
- Extend `@theme` instead of arbitrary values
- Test both light and dark themes
</important>

<important if="you are creating or modifying interactive UI elements, buttons, links, or navigation">

- Icon buttons: `aria-label`. Decorative icons: `aria-hidden="true"`
- `<button>` for actions, `<a>`/`<Link>` for navigation
- Visible focus: `focus-visible:ring-*`. Never `outline-none` without replacement
- Buttons/links need `hover:` state with progressive contrast
- URL reflects state (filters/tabs/pagination in params). Deep-link stateful UI
- Destructive actions: confirm or undo, never immediate
</important>

<important if="you are creating or modifying form elements or inputs">

- `autocomplete` + meaningful `name`. Correct `type`/`inputmode`
- Never block paste. `spellCheck={false}` on emails/codes/usernames
- Submit enabled until request starts, spinner during
- Errors inline, focus first error on submit
- Warn unsaved changes on nav. `autocomplete="off"` on non-auth fields
</important>

<important if="you are adding or modifying animations or transitions">

- Honor `prefers-reduced-motion`
- Animate `transform`/`opacity` only. Never `transition: all` — list explicitly
- SVG: transforms on `<g>` with `transform-box: fill-box; transform-origin: center`
- Animations must be interruptible
</important>

<important if="you are adding or modifying images">

- `<img>` needs `width` + `height`
- Below-fold: `loading="lazy"`. Above-fold: `fetchpriority="high"`
</important>

<important if="you are rendering lists, optimizing performance, or working with large datasets">

- Lists >50 items: virtualize
- No layout reads in render. Batch DOM reads/writes
- Prefer uncontrolled inputs
- `<link rel="preconnect">` for CDN domains
</important>

<important if="you are working with text content, typography, or copy">

- `…` not `...`. Curly quotes. Non-breaking spaces: `10&nbsp;MB`, `⌘&nbsp;K`
- `tabular-nums` for number columns. `text-wrap: balance`/`text-pretty` on headings
- Long text: `truncate`/`line-clamp-*`/`break-words`. Flex children: `min-w-0`
- Active voice. Title Case headings/buttons. Specific button labels. Errors include fix
</important>

<important if="you are working with dates, numbers, or internationalization">

- `Intl.DateTimeFormat`/`Intl.NumberFormat`, not hardcoded formats
- Language via `Accept-Language`/`navigator.languages`, not IP
</important>

<important if="you are adding touch interactions, drag-and-drop, or mobile gestures">

- `touch-action: manipulation`. Set `-webkit-tap-highlight-color`
- Modals: `overscroll-behavior: contain`. Drag: disable selection, `inert` on dragged
</important>

<important if="you are setting up dark mode or color-scheme">

- `color-scheme: dark` on `<html>`. `<meta name="theme-color">` matches bg
- Native `<select>`: explicit `background-color` + `color`
</important>

<important if="you are entering plan mode or creating a plan">

Make the plan concise. Sacrifice grammar for the sake of concision.
</important>

<important if="you need to automate browser interactions or test in a browser">

Use `agent-browser` for web automation. Use `agent-browser` skill. Run `agent-browser --help` for all commands.

1. `agent-browser open <url>` — navigate to page
2. `agent-browser snapshot -i` — get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` — interact using refs
4. Re-snapshot after page changes
</important>
