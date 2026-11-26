---
name: fire
description: Build or change any interface in a product that uses the Fire design system (fd- classes, --fd- tokens, the fire-design package, a fire/ folder). Use it before writing or editing a screen, a page, a component, a public site or docs page, or interface text; when choosing which reference screen or part to use; when checking a screen before calling it done; and when Fire lacks something and it must be proposed. Finds the nearest reference screen by use case, searches the parts, runs Fire's checks, and files proposals as issues on Fire's repository.
---

# Fire

Fire is a design system: HTML with `fd-` classes, `data-` variants and `--fd-` tokens. It ships whole reference
screens, a searchable catalogue of parts, and checks. Screens built without the reference screens come out as valid
parts in the wrong arrangement, so this skill starts with them.

Work in this order. Do not skip a step because the task looks small.

## 1. Find Fire

```bash
node <this skill's folder>/where.mjs
```

It prints the project's Fire, this skill's Fire, and the folder to read from. Call that folder `$FIRE` below. Read
any note it prints: when the project builds with an older Fire, a newer part is not available to it.

Everything below is inside `$FIRE`:

| What | Where |
|---|---|
| Every reference screen, with when to use each | `skills/fire/screens.md` |
| Every part, one line each | `skills/fire/parts.md` |
| The reference screens themselves | `templates/<id>.html` |
| A picture of every screen and part | `contract/pictures/<kind>/<id>.png` |
| Docs pages with live specimens and their markup | `docs/<page>.html` |
| The rules | `AGENT-RULES.md`, then `GUIDE.md` and `WRITING.md` |
| Every class and attribute value | `docs/_ref/CLASSES.md` |
| Search, lint, review, propose | `scripts/fire.mjs` (`npx fire …` in a project that has installed Fire) |

## 2. Choose the reference screen, before any markup

Every screen follows a reference screen. Choosing it is your job, by meaning, and no search does it for you.

1. For the screen you are building, write down the person's task in one sentence, the shape of the data (one record,
   a list, a series, a form, text) and where it is used (app, website, phone, email).
2. Read the index at the top of `$FIRE/skills/fire/screens.md`: one line for each of the reference screens, about
   sixty lines in all. Read every line. If your reader cuts the file short, read it in parts; do not search it for a
   word instead, because the right screen is often one whose name you would not have guessed.
3. Pick the two or three nearest by task and shape, and read their full entries further down the same file. The
   subject does not have to match: a list of invoices follows `logs`, one customer's page follows `record`, a set-up
   flow follows `onboarding`. Each entry's "Not when" line names the screen to use instead.
4. Open its picture with your file reader (`$FIRE/contract/pictures/template/<id>.png`) and look at it. Then read
   `$FIRE/templates/<id>.html`: its regions in order (page head, toolbar, table or sections, foot), the parts in
   each, and the markup of every state you need (`?state=<name>`; the card lists them).
5. Say your choice before you build, in one line: the screen, the reference it follows, why, and the runner-up you
   rejected. When nothing is close, say that instead: a screen with no reference is a gap to raise, not a licence to
   invent a layout.

Then build the screen fresh in the reference's structure, each part written from Fire's own markup. A reference
screen is read, never copied and edited: its data, names and text are a demo product's.

For an app with several screens, map every screen to its reference first (a table: screen, reference, why) and put
the table where everyone building the app reads it. One page head, one form pattern and one way to show a list for
the whole app.

A public page is composed from website sections: the website screens in `screens.md` list their sections in order.

## 3. Choose the parts

1. Search by what the part does, in two or three different phrasings:
   `node $FIRE/scripts/find.mjs "<what it does>" --surface app` (`--kind`, `--data` and `--json` narrow it; `--json`
   gives each result's picture). A "drawer" is a `sheet`, a "pill" is a `badge`, a "wizard" is `steps`.
2. When the search gives nothing close, read the part's family in `$FIRE/skills/fire/parts.md`.
3. Read the chosen part's card in `$FIRE/contract/catalog.json` (`useWhen`, `avoidWhen`, variants, states, keyboard),
   look at its picture, and copy its markup from the docs section the card's `example` names. Never write a part
   from memory, and never use a class that `docs/_ref/CLASSES.md` does not list.

## 4. Build by the rules

Read `$FIRE/AGENT-RULES.md` before the first line and follow it. It is short, and it names the sections of
`GUIDE.md` and `WRITING.md` to read for forms, loading, decisions, a public site and interface text. The rules that
are broken most often:

- No custom CSS, `style` attributes, pixel values or widths in markup. Lay out with Fire's layout parts.
- Every state is built: empty, loading, error, disabled, and each state the reference screen has that applies to
  yours. Loading keeps the shell and shows a skeleton shaped like the content.
- One primary button per view. A dangerous action is confirmed in place; a reversible one offers Undo.
- Text follows `WRITING.md`: sentence case, a verb on every button, no filler.

## 5. Check before you say it is done

1. `npx fire lint <files>` and, if you wrote CSS, `npx fire lint-css <files> --prefix <yours>`. Fix every finding.
2. `npx fire review` opens every screen at 1440 and 375, light and dark, and writes a gallery. Fix every error.
3. Open your screen's picture from the gallery beside the reference screen's picture and compare them region by
   region: the page head, the spacing between regions, where the primary action sits, how the list or form is held.
   A difference you cannot give a reason for is a fault. Then use the keyboard.
4. Report, for each screen, in these words, so nothing is left unsaid:
   - Follows: the reference screen, and what you changed from its structure and why.
   - States built: each one. States the reference has that you left out: each one, and why.
   - Compared with the reference's picture: yes or no. Keyboard: yes or no. Phone width and dark: looked at, or only
     checked by the tools.

## 6. When Fire does not have it

Follow `contributing.md` beside this file. In short: search again, compose from existing parts, and only then build
it to Fire's standard with `x-` classes and file it as an issue on Fire's repository with `fire propose`. The issue
is public, so it carries the component and nothing about the product. Never build a one-off silently, and never
style or override an `fd-` class.

## Working on Fire itself

In Fire's own repository, also read `DESIGN.md` (the contract every part follows) and `HANDOFF.md` (setup and the
release steps). A new part needs its card, a docs specimen, a picture and tests, and must pass `npm run check`.
