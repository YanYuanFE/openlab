# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two primary audiences, equally weighted:
- **High-school chemistry students** studying on their own, at home on a computer or phone: previewing, reviewing, or preparing for exams by walking through an experiment themselves.
- **High-school chemistry teachers** in the classroom, projecting an experiment on a large screen and talking through it while students watch.

Both work through the same lesson flow; neither has a separate mode today.

## Product Purpose

OpenLab lets someone do the experiments of Chinese high-school chemistry in the browser: pick up apparatus, add reagents, watch the reaction happen, and answer questions about what they saw. Success is a student who can explain what each step does and why, and a teacher who can show an experiment the school lab cannot run.

## Positioning

A guided, real-3D lab where every phenomenon comes from a rule-based ion engine rather than canned animation: colours, precipitates, gas and pH follow from what is actually in the vessel. It covers the six 学生必做实验 of the curriculum plus six 演示与拓展实验 that are toxic, dangerous or hard to do in a school lab (chlorine, sodium and water, thermite, ammonia fountain, acetylene, electrolysis of CuCl₂).

## Operating Context

- Each lesson is a fixed sequence of steps: act (pick up a tool, click a target), quiz (multiple choice), and control (continuous interaction such as titrating or filling to the mark).
- Runs on school projectors and classroom PCs as well as students' own laptops and phones.
- No account and no install: open the page and start.

## Capabilities and Constraints

- Web app; routes `/` (landing), `/lessons`, `/lessons/:id`, `/book`. Static hosting.
- Progress (finished lessons, book stamps) is kept only in the visitor's browser; there is no backend or login.
- Never show textbook locations (教材位置) anywhere.
- UI text is Chinese.
- 《每一个原子》 (`/book`) is a secondary, additional reading piece: a pen-and-ink chemistry book shown as a 3D open book. The lab is the core product.
- Stage: preparing for public launch to real students and teachers.
- Undecided: pricing, licensing, school partnerships, analytics.

## Brand Commitments

- Name: OpenLab. The book's title is 《每一个原子》.
- The lab and the book have deliberately different looks (the lab's bench palette vs the book's paper and ink); keep them apart.

## Evidence on Hand

- Real content: 12 lessons with full step data (`src/lessons/`), 10 book chapters (`src/book/`).
- No users yet: no testimonials, usage numbers, school logos or reviews exist. Do not invent any.

## Product Principles

1. The chemistry is right first; visuals follow from the engine, never the other way round.
2. Every step asks the learner to do or decide something, then shows the consequence.
3. Works for a student alone and for a teacher in front of a class, without separate modes.
4. Zero friction to start: no account, no install, nothing to download.

## Accessibility & Inclusion

- Must be readable on a classroom projector from the back of the room (inferred from classroom use; not yet confirmed).
- Must work on phones as well as desktop.
- The book provides a screen-reader text version where every printed control is a real button; the lab Player has no keyboard or text path yet.
