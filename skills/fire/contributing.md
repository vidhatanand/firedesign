# When Fire does not have what you need

Follow these steps in order. `GUIDE.md` section 7 in Fire is the full text; this is the working copy for an agent.
`$FIRE` is the folder `node where.mjs` prints.

## 1. Make sure it is missing

Most "missing" parts exist under another name.

- Search three ways: by what it does, by what other systems call it, and by the data it shows.
  `node $FIRE/scripts/find.mjs "<words>"`, with and without `--surface`.
- Read the family in `parts.md` and the nearest reference screens in `screens.md`.
- Search Fire's issues: someone may have asked already, or Fire may have answered.
  `gh issue list --repo <Fire's repository> --state all --search "<words>"`
- Keep a note of every query and the nearest entry each gave. The proposal needs them.

## 2. Compose first

A card with a table in it, a setting row with a secret field, a sheet with a form: an arrangement of existing parts
with their variants and states needs no proposal. Build it with the layout parts.

It is a gap when nothing is close, or when you wanted a custom class, a pixel value or a raw colour; when a part
needs a variant, size, tone or state it does not have; when a token is missing; when you built the same arrangement
twice; or when a part cannot be used by keyboard or reads wrongly to a screen reader.

## 3. Build it to Fire's standard

- A root class `x-<name>` and parts `x-<name>-<part>`; variants as `data-` attributes; state as ARIA or `data-state`.
- Every value from a Fire token. No raw colours or lengths, no `url()`, no `@import`.
- Every state, light and dark, phone and desktop, keyboard, reduced motion.
- Its CSS in the project's `fire-local.css`, loaded after Fire.
- Never style or override an `fd-` class or a `--fd-` token, never edit Fire's files, never copy a Fire part and
  change the copy.

Do not stop the product work while Fire decides.

## 4. Write the proposal

```bash
npx fire propose new <slug> --kind component
```

Kinds: `component`, `variant` (a variant, size or state of a part Fire has), `token`, `pattern` (an arrangement of
parts), `bug`, `accessibility`. It writes `docs/fire/proposals/<slug>.md`: the issue, with every section to fill.

Fill every section so Fire can adopt it without asking you anything:

- **The title** says what the part does, not what you called it.
- **What I was building**: the kind of screen and the person's task, in two sentences.
- **What is missing**: the thing, by what it does.
- **What I searched**: every query, the nearest Fire entry, and one sentence on why it does not fit.
- **The component**: a card in Fire's format (`$FIRE/contract/cards/README.md`: job, purpose, when to use it, what to
  use instead, other names, surfaces, data, states), one complete example of the markup, the CSS from
  `fire-local.css`, and the script or the behaviour on each key.
- **What I checked**: only what you did check.
- **Where else it applies**: other kinds of screen that would use it.

A bug or accessibility report has what happens, what should happen, the smallest markup that shows it, and where
(browser, width, light or dark, keyboard or screen reader).

## 5. Keep private things out

The issue is public and stays public. It describes a component, never a product.

- No product, company, customer or person's name. Write "a video library", not the product. Example data comes from
  Fire's demo product, Ember (runs, deploys, API keys, agents, logs).
- No file paths from the project, no addresses of private or local sites, no email addresses, no keys or tokens.
- No screenshot of a real screen. A picture shows the component with demo data, and is added in the browser.
- Where the component is used (file and line) stays in the project, as a comment above its rules in
  `fire-local.css`.

List the project's private words once, in its `package.json`, so the check knows them:
`"fire": { "private": ["Acme", "acme.example"] }`.

```bash
npx fire propose check docs/fire/proposals/<slug>.md
```

Fix every error. Read every warning and decide.

## 6. File it

```bash
npx fire propose send docs/fire/proposals/<slug>.md --dry-run
```

Read what it will post. Then, if the project's instructions allow agents to file Fire issues, run it without
`--dry-run`; if they do not say, show the owner the file and ask. It needs the `gh` command, signed in. It stops if
an issue with the same title exists, files the issue with its label, writes `Issue: <url>` at the end of the
proposal, and prints the comment to put above the rules in `fire-local.css`.

Tell the owner what you filed, with the link.

## 7. When Fire answers

Fire answers on the issue. **Adopted**: the issue is closed with the release that ships it as an `fd-` part; update
Fire, replace the `x-` part with Fire's, and delete its rules from `fire-local.css`. **Declined**: the issue says
why, most often which parts to compose instead; follow it, or keep the part as the project's own. An empty
`fire-local.css` is the goal.

Raise smaller things the same way: an arrangement you built twice, a variant you wished for, a token you had to
approximate, a rule that was unclear.
