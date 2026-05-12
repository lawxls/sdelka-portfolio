---
name: laws-of-ux
description: Use when designing, reviewing, or improving product UX with psychology-informed heuristics from the 30 Laws of UX. Apply these principles to interface critiques, product specs, flows, IA, onboarding, forms, dashboards, and design-system decisions.
---

# Laws of UX

Use this skill to apply psychology-informed UX principles during product design, critique, and implementation. The 30 law names are sourced from Jon Yablonski's Laws of UX project; the guidance below is original, paraphrased, and intended for practical design work.

## Workflow

1. Identify the user goal, task context, and likely constraints.
2. Select the few laws most relevant to the design decision; do not force all 30 into every review.
3. Translate each selected law into concrete UI implications.
4. Check for tradeoffs: simplifying one part of the experience can move complexity elsewhere.
5. Recommend observable changes: labels, grouping, layout, timing, feedback, defaults, ordering, constraints, or progressive disclosure.
6. Flag ethical risks when a principle could be used to manipulate attention, urgency, memory, or choice.

## The 30 Laws

### Aesthetic-Usability Effect

People are more forgiving of minor usability issues when an interface feels polished, coherent, and visually pleasing. Use visual quality to build confidence, but do not let beauty hide broken flows.

Apply it by tightening spacing, typography, hierarchy, motion, and visual consistency while still testing whether users can complete the task.

### Choice Overload

Too many options can slow people down or cause abandonment. Reduce, group, sequence, or recommend choices when users need to decide.

Apply it by using sensible defaults, short option sets, comparison helpers, progressive disclosure, and clear "recommended" paths.

### Chunking

People understand and remember information more easily when it is grouped into meaningful units. Break dense information into scannable sections.

Apply it with grouped fields, step-based flows, short sections, clear headings, and patterns that match how users think about the task.

### Cognitive Bias

Human judgment is shaped by predictable shortcuts and blind spots. Design decisions should account for how framing, defaults, salience, and prior beliefs influence behavior.

Apply it by reviewing defaults, labels, pricing, warnings, and empty states for unintended pressure or misleading emphasis.

### Cognitive Load

Every interface asks users to spend mental effort. Lower unnecessary effort so users can focus on the actual task.

Apply it by removing ambiguity, simplifying copy, reducing mode switches, exposing only relevant controls, and keeping system status visible.

### Doherty Threshold

Fast feedback keeps people engaged. Interfaces feel more productive when the system responds quickly enough that users do not feel blocked.

Apply it by optimizing perceived speed, giving immediate feedback, using optimistic UI where appropriate, and showing progress for longer operations.

### Fitts's Law

Targets are easier to reach when they are larger and closer to the user's current pointer, thumb, or focus area.

Apply it by making primary actions large enough, spacing touch targets safely, placing frequent actions in reachable zones, and avoiding tiny destructive controls.

### Flow

People become deeply engaged when challenge, skill, feedback, and momentum are balanced. UX should reduce interruptions during focused work.

Apply it by supporting clear next steps, fast feedback, keyboard continuity, autosave, and low-friction recovery from errors.

### Goal-Gradient Effect

Motivation often increases as people can see themselves getting closer to a goal. Progress visibility can encourage completion.

Apply it with progress indicators, completion states, milestones, setup checklists, and honest feedback about remaining effort.

### Hick's Law

Decision time grows as the number and complexity of choices increase. Make important choices easier to compare and act on.

Apply it by reducing visible choices, grouping related options, separating advanced settings, and designing menus around user intent.

### Jakob's Law

Users bring expectations from other products. Familiar patterns reduce learning cost.

Apply it by reusing established conventions for navigation, forms, search, cart behavior, settings, and destructive confirmations unless there is a strong reason to differ.

### Law of Common Region

Elements inside the same visible boundary are perceived as related. Containers can clarify grouping.

Apply it with fieldsets, panels, table regions, selection areas, and subtle boundaries that communicate relationship without adding clutter.

### Law of Proximity

Elements near each other are understood as belonging together. Spacing is meaning.

Apply it by placing labels close to controls, grouping related actions, and increasing distance between unrelated sections or commands.

### Law of Pragnanz

People tend to interpret complex visuals in the simplest stable form. Overly complex shapes, charts, or layouts can be misread.

Apply it by simplifying visual structure, reducing decorative noise, and making charts, icons, and diagrams easy to parse at a glance.

### Law of Similarity

Items that look alike are perceived as related or equivalent. Visual style creates categories.

Apply it by making similar actions look consistent, making different actions visibly distinct, and avoiding reused styles for unrelated meanings.

### Law of Uniform Connectedness

Visually connected items are perceived as more related than disconnected items. Connection can be stronger than proximity or similarity.

Apply it with lines, connectors, shared backgrounds, selection links, grouped controls, and relationship indicators in diagrams or complex forms.

### Mental Model

Users act based on their internal understanding of how a system works. Interfaces should align with that model or gently reshape it.

Apply it by using domain language, predictable object relationships, clear cause and effect, and onboarding only where the model needs help.

### Miller's Law

Working memory is limited. Do not ask users to hold too many unrelated things in mind at once.

Apply it with recognition over recall, visible summaries, grouped navigation, saved state, previews, and short task steps.

### Occam's Razor

When multiple explanations or solutions work equally well, prefer the simpler one. Complexity needs a reason.

Apply it by choosing the simplest interaction that satisfies user needs, deleting redundant states, and resisting speculative features.

### Paradox of the Active User

Many users start acting before reading instructions. Interfaces should be learnable through use.

Apply it with inline guidance, forgiving defaults, visible affordances, examples in context, and clear recovery paths.

### Pareto Principle

A small subset of causes often drives most outcomes. Prioritize the high-impact tasks and users first.

Apply it by identifying the most common journeys, optimizing frequent actions, and making rare or advanced tasks accessible without dominating the UI.

### Parkinson's Law

Work tends to expand to fill the time available. Time constraints and scope boundaries shape behavior.

Apply it with lightweight deadlines, bounded setup, clear task scope, and workflows that prevent endless tweaking when done is enough.

### Peak-End Rule

People often judge an experience by its most intense moment and how it ends. Design the emotional high and the closing moment carefully.

Apply it by reducing pain at critical points, making completion satisfying, and ending flows with clarity, reassurance, and next steps.

### Postel's Law

Systems should accept varied input gracefully while producing clear, predictable output. Be tolerant of user behavior and strict in system response.

Apply it by accepting flexible formats, correcting harmless input issues, validating clearly, and normalizing data behind the scenes.

### Selective Attention

People focus on what seems relevant to their current goal and miss other signals. Important information must compete intelligently for attention.

Apply it with clear hierarchy, contextual alerts, meaningful contrast, and restraint around badges, banners, and notifications.

### Serial Position Effect

People tend to remember the first and last items in a sequence best. Ordering affects recall and choice.

Apply it by placing important navigation, list items, and setup steps at memorable positions, while avoiding burying critical items in the middle.

### Tesler's Law

Some complexity is inherent and must be handled somewhere: by the user, the interface, the system, or the team building it.

Apply it by moving avoidable burden away from users, but keeping enough transparency that the interface does not become confusingly abstract.

### Von Restorff Effect

Distinct items stand out and are more likely to be remembered. Difference is powerful when used sparingly.

Apply it by reserving strong contrast, badges, color, or motion for truly important states or primary actions.

### Working Memory

People can temporarily hold and manipulate only a limited amount of information while completing a task.

Apply it with persistent context, comparison views, visible selections, short forms, and summaries that prevent users from memorizing details.

### Zeigarnik Effect

Interrupted or unfinished tasks can remain mentally active. Open loops can motivate return, but can also create stress.

Apply it with draft states, reminders, saved progress, completion cues, and respectful notifications that help users resume without pressure.

## Review Prompts

- Which user decision is harder than it needs to be?
- Which information should be grouped, hidden, sequenced, or made persistent?
- Which action needs a larger, closer, or more conventional target?
- Where does the design ask users to remember something that could be shown?
- Where does the design create visual similarity, proximity, or connection that implies the wrong relationship?
- Where can the system absorb complexity instead of pushing it onto the user?
- Which moment will users remember most, and how does the flow end?
- Does the design use psychology to support user goals rather than manipulate them?
