# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

OpenLab: a guided, real-3D virtual chemistry lab for Chinese high-school chemistry (12 lessons). UI text is Chinese; code and comments are English. Don't show textbook locations (教材位置) anywhere.

## Commands

```bash
npm run dev       # Vite dev server
npm test          # node --test src/**/*.test.ts (Node 24 native TS stripping, no test framework)
node --test src/chem/engine.test.ts   # single test file
npm run lint      # oxlint
npm run build     # tsc -b && vite build
```

Stack: Vite + React 19 + TS + Tailwind v4 (`@tailwindcss/vite`) + shadcn/ui (base-nova style on Base UI; `cn` comes from the npm package `cn`). 3D is React Three Fiber + drei over three.js. All apparatus is procedurally modeled — no model files. Path alias `@/` is set via `paths` only (no `baseUrl`, deprecated in TS 6). Routing is React Router 7 (browser history, no `#`), defined in `src/App.tsx`: `/` landing page (`src/landing/`), `/lessons` lesson list, `/lessons/:id` player, anything else a not-found page. Static hosting needs a rewrite of all paths to `index.html`.

## Architecture

**Lesson = data + scene.** Each `src/lessons/<name>.tsx` exports a `Lesson<S>` (`src/lessons/types.ts`) with its own state type `S`, registered in `src/lessons/index.ts`. `group` (`required` | `demo`) decides the home-page section. `src/Player.tsx` is the generic runner; lessons never own UI chrome.

**Three step kinds:**
- `act` — pick up `tool` (optional), click `target`. Player sets `anim` with a `verb`; the Scene plays it and calls `onCommit` (state change via `apply`) then `onFinish` (show observation). `apply` gets `now` so time-varying phenomena are stored as timestamps.
- `quiz` — multiple choice, optional `Figure`.
- `control` — continuous interaction driven by a `Panel` in the step card (titration, filling to the mark); calls `complete()`.
`observe` / `choices` / `answer` / `explain` may be functions of state (`dyn`).

**Chemistry vs rendering.** `src/chem/engine.ts` is a pure rule-based ion engine: species carry timestamps, rules can have delays (e.g. temperature-dependent), and `look()` maps contents to `{color, opacity, grains, bubbles, gas}`. `src/chem/titration.ts` computes the pH curve. Keep chemistry pure and tested; scenes only read `look()`.

**Time-varying visuals are computed per frame**, not at render: `Vessel` `volume`, gas flow, burnt/drip states take functions of the current time evaluated in `useFrame`. Computing them at React render time freezes them.

**Kit (`src/kit/`):**
- `shapes.ts` — vessel interior profiles and volume↔liquid-height conversion (tested).
- `vessel.tsx` — generic glass vessel (inner and outer wall; beakers get a spout at +x, the side `originFor` pours from); liquid uses a world-space horizontal clipping plane placed by `surfaceFor` so the surface stays level *and* the volume is kept when tilted, with an elliptical surface cap while the plane crosses the walls. Profiles come from `profilePoints`, which keeps points only where the wall curves.
- `carry.tsx` — tool pick-up and verb animations (drip/pour/stir/dip/place…); `originFor()` places pour lips.
- `core.tsx` — shared primitives incl. `Passthrough` (held tools must not block raycasts) and `HitBox` (invisible click area for thin items), auto-width `Tag` labels.
- `apparatus.tsx`, `lab2.tsx` — apparatus and effects.
- `Stage.tsx` — shadows are automatic: every opaque non-basic mesh casts and receives (set `userData.noCastShadow` to opt out of casting, e.g. large flat surfaces that would self-shadow); `PerformanceMonitor` turns them off on slow devices. Post-processing was tried and dropped: the composer replaces renderer tone mapping and changes how transparent liquids blend. Orthographic camera; `FitCamera` uses `setViewOffset` to fit `extent` into the area not covered by overlay panels (left 290px on ≥768px, top 120, bottom 170). New scenes must keep items inside that area.

UI colors come from theme tokens in `src/index.css` (`bench`, `bench-soft`, `ink`, `ink-soft`, `hazard`; shadcn vars map onto them) — use those classes, not hex values, in 2D UI. Home tiles show one key formula per lesson from the `FORMULA` map in `src/Home.tsx`; add one for each new lesson.

The landing hero (`src/landing/FlaskScene.tsx`) is self-contained: a custom `ShaderMaterial` raymarches the liquid volume (the flask radius profile is duplicated in GLSL) to draw the falling dye plume. Avoid GLSL reserved words like `active` as identifiers — a compile error only shows in the browser console.

Shared lesson helpers (reagent shelf, pouring, `lookOf`) are in `src/lessons/common.tsx`.

## The book (`/book`, `src/book/`)

《每一个原子》: a pen-and-ink chemistry book shown as a real 3D open book on a desk (modelled on Every Joule). `BookView.tsx` is the whole route: one Canvas with the desk, the book and the pop-up drawing, a floating bottom bar (contents, ‹ ›, ▶ demo, phone-only text/drawing toggle) and a screen-reader text version where every printed control is a real button.
- **Spreads.** Each chapter is a hook (`useChapter1`, `useChapter2`…) returning `SpreadDef[]` (`spread.ts`): printed left page, right page (ledger on top, caption under the pop-up), the pop-up node with its footprint `extent`, `onHit(id, i)` for printed controls, `play` for ▶, and which page a phone should `focus`. Chapters 3–9 share one spread shape via `useLesson` (`lesson.tsx`): predict → ▶ demo steps → hands-on (`Hands`, owned by the chapter; printed links mirror every 3D tap so the text version can do it too) → a challenge question on the left page that stamps the chapter. Shared drawings (`Balance`, `Bubbles`, `Pointer`, `EquationPlate`, flasks) are exported from `ch2.tsx`. Front/back matter is in `front.tsx`; register new chapter hooks in `BookView` and mark them `written` in `CHAPTERS`. Page changes always go through `go()`, which animates a `Leaf` turning over the spine.
- **Printing.** Pages are typeset, not HTML: `print.ts` (pure, tested) lays out blocks (`para`, `choices`, `flap`, `links`, `ledger`, `equation`, `toc`…) into draw ops and click rectangles in page cm, breaking CJK per character with hanging punctuation and never splitting a formula (`fml`; `SO4^2-` sets the charge as a superscript, also in `Label`). A `ledger` shows the chapter-1 seven jars unless given `syms` (later elements live in `MORE_ELEMENTS`); a `plot` prints a line graph (the titration curve). `paper.tsx` paints them into a canvas texture; `desk.tsx` maps a click's uv back to page cm and `hitAt`. A `flap` is a 3D card hinged on its bottom edge that flips onto the blank page below, so keep flaps last on a page.
- **Drawing.** `ink.tsx` (`Inked` = hatched wash + `Pen` outlines + folding shadow, `Glass`, `Label` printed flat) and `models.tsx`; pure chemistry in `atoms.ts`/`molecules.ts` (tested — add a model before drawing a new species). Pop-ups are drawn in their own cm and scaled onto the page; tall things occlude the ledger above, so keep their footprint generous. Pages use the hatching `Ink` with `pop={false}`; the desk, cover and turning leaf use plain Lambert (the leaf shows the reverse print through and lets light through).
- **Pop-up fold** (`pop.ts`): every pop-up material runs vertices through `popWorld()` — at lift 0 the drawing lies flat as a printed cabinet-oblique picture, then hinges up about its front edge and its depth returns last. `PopUp` (in `ink.tsx`) drives the shared uniforms; any new material in a pop-up must call `popVertex` (use `Ink`, `PopBasic`, `Pen`) or it will stand while the rest folds, and shadow casters need `customDepthMaterial={POP_DEPTH}`. Printed captions (`Label`, `userData.print`) deliberately don't fold.
- **Pen** (`pen.ts`, tested): outlines are screen-space ribbons derived from the geometry type — facing rings for spheres, shader-computed silhouettes plus rims for turned shapes (`LatheGeometry`/cylinder/cone/caps), both edges of tubes, creases of faceted solids — with pen pressure, tapered ends and a draw-on schedule. New shapes get strokes automatically if built from those three.js geometries.
- **Post** (book only): N8AO contact shadows, SMAA and a vignette via `@react-three/postprocessing`. Unlike the lab, glass and liquid blending was checked and is fine here. Lit ledger jars spill their colour onto the paper (a tint in the print plus an emissive `spill` texture).
- Don't use drei `Html` (its per-label React roots throw on unmount). To script 3D clicks in a browser, call the R3F root's `events.handlers` with correct `offsetX/offsetY` (project a world point with the camera); synthetic `PointerEvent`s dispatched on the canvas get wrong offsets and miss.
