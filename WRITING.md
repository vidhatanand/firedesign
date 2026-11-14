# Writing for the interface

How to write the words in a product built with Fire: labels, buttons, descriptions, help text, empty states, errors, confirmations and agent messages. It is for people and for AI agents, and it applies to every screen.

The aim is an interface that reads as clean because every word on it is doing work. That is different from an interface with few words. Cutting useful words makes a screen quiet and useless; the skill is knowing which words are useful.

These rules come from studying a well-made developer console screen by screen, and noting what its copy does and does not do. The examples are written for Ember, the demo product.

## 1. The idea

**The screen is the explanation. Words are what is left over.**

A good screen explains itself through its structure: what is grouped together, what is first, what is a button, what is disabled, what the current value is. Words fill the gaps that structure cannot. So before writing a sentence, ask whether the layout could say it instead:

- A filter that shows its current value ("Last 7 days") needs no label saying "Date range".
- A disabled Save button says "nothing has changed" without a note.
- A figure with its unit ("1,520 credits") needs no sentence about what it measures.
- An example already typed in a field says more than a paragraph about the format.

Then write only for the gaps, and keep to three habits.

1. **One job per element.** A title names the thing. A description says what you do with it. A hint says what happens. A button says the action. When one element tries to do two of these jobs, it gets long.
2. **Say it once.** If the title says "API keys", the description must not begin "API keys are…". If the button says "Create key", the dialog title should not be "Create a new API key for your team".
3. **Put detail one step away.** Everything a person needs to act stays on the screen. Everything they might want to know goes behind a tooltip, a "Learn more" link or the docs.

## 2. How to write a piece of copy

Do this in order. It takes a minute and it is the whole method.

1. **Write what the person needs to decide or do here**, in one plain sentence, as if telling a colleague. Do not try to be short yet.
2. **Delete what the screen already shows.** The page title, the section they are in, the field's label, the value in the field.
3. **Delete what they already know.** That forms are filled in, that buttons are clicked, that saving saves.
4. **Replace every adjective with a fact.** "Fast" becomes "about 2 seconds". "Some formats" becomes "PDF, DOCX and XLSX". "Soon" becomes "Nov 23".
5. **Move the rest away.** Background, edge cases and reasons go to a tooltip, a link or the docs.
6. **Read what is left aloud.** If you would not say it to someone sitting next to you, rewrite it.

Worked example, a setting for a monthly spending limit:

| Step | Text |
|---|---|
| First draft | "This setting allows you to configure a monthly spend cap for your team. Once the cap has been reached, any further requests will be rejected until the next billing cycle begins, so please make sure you set it high enough." |
| After steps 2 and 3 | "Once the cap is reached, further requests are rejected until the next billing cycle." |
| After step 4 | "Requests stop when you reach the cap, until credits reset on Nov 23." |
| Final, split by job | Title: **Monthly spend cap** · Description: "Requests stop at the cap until credits reset." · Field shows `1,000 credits` |

Forty words became eight, and nothing a person needs was lost.

## 3. Word budgets

These are the lengths the reference keeps to. Treat them as limits, not targets.

| Element | Length | It says |
|---|---|---|
| Navigation item | 1 to 3 words | The task ("Scrape a page") or the place ("Usage") |
| Page title | 1 to 3 words | The name of the place |
| Page description | One line, up to 12 words | What you do here |
| Section title | 1 to 3 words | The name of the thing |
| Section description | One sentence, up to 14 words | What it is for, or what changing it does |
| Button | 1 to 3 words | The action: a verb, or a verb and its object |
| Field label | 1 to 3 words | The name of the value |
| Placeholder | A realistic example value | What a good answer looks like |
| Hint under a field | Up to 12 words | One of: the effect, the default, the limit, an example |
| Field error | Up to 16 words | What is wrong and how to fix it |
| Tooltip | Up to 8 words | The name of an icon-only control, or one definition |
| Badge, tag, status | 1 or 2 words | The state |
| Stat label | 1 to 3 words | What the figure counts |
| Table header | 1 or 2 words | The column's value |
| Empty state | Title up to 5 words, one sentence, one action | What will appear and how to make it appear |
| Toast | Title up to 4 words, optional line up to 10 | What is now true |
| Dialog | Title up to 6 words, body up to 2 sentences | The action, then the consequence |
| Callout | Title up to 5 words, body up to 2 sentences | Something that needs attention now |

If you are over the budget, the element is doing two jobs. Split it or move part of it away.

## 4. Each kind of text

### Navigation
Name tasks by what the person does, and places by what they are. "Scrape a page", "Monitor the web", "Parse a file"; "Usage", "API keys", "Settings". A technical name can sit beside the label in mono (`/scrape`) for people who think in endpoints.

### Page head
A title and one line. The line starts with a verb and says what this page is for. It does not welcome anyone or describe the product.

| Write | Not |
|---|---|
| **Activity logs** · "Every request your keys made, with its status and credits." | "Welcome to the Activity Logs page, where you can take a look at your recent request activity." |

### Sections and settings
A short title, then one sentence that says what the thing is for or what changing it does. If the sentence only repeats the title, delete it.

| Write | Not |
|---|---|
| **Team slug** · "Used in your team's URLs. Leave blank to use the team ID." | **Team slug** · "The team slug is the slug for your team." |
| **Zero data retention** · "Ember stores no page content or request bodies for this team." | **Zero data retention** · "Enable this option to turn on zero data retention mode." |

### Buttons
A verb, or a verb and its object. The label says what happens when it is pressed, so a person can decide without reading anything else.

- Prefer the specific verb: "Create key", "Export CSV", "Copy link", "Start crawl", "Revoke".
- One word is enough when the object is obvious from the place: "Save", "Run", "Install", "Delete".
- Never "OK", "Submit", "Yes", "Click here", "Continue" (unless it truly is a step in a sequence).
- The primary button in a dialog repeats the verb of the dialog's title: "Delete team?" has "Delete team", not "Confirm".

### Fields
- **Label:** the name of the value, as a noun. "Team name", "Monthly limit". Not a question and not an instruction.
- **Placeholder:** an example that could be real. `production-crawler`, `https://docs.example.com`. Never the label again, never "Enter…".
- **Hint:** only when a careful person could still get it wrong. Say one thing: the effect ("Shown on invoices."), the default ("Leave blank to use the team ID."), the limit ("Up to 100 per page."), or an example ("For example `VP of Sales`. Separate several with commas.").
- **Error:** what is wrong and what to change, in the field's own terms. "Use 3 to 40 characters." "This name is taken. Try `quarry-labs-2`." Not "Invalid input".

### Filters and controls that hold a value
Show the current value as the label: "All endpoints", "Last 7 days", "Format: Markdown", "All API keys (3)". The control then needs no separate caption, and the screen reads as a sentence about what is being shown.

### Figures and stat tiles
A short label, the figure with its unit, and at most one small qualifier that gives the figure meaning: the comparison, the limit, or the date.

- "Credits used · 1,480 · 12.4% more than last month"
- "Credits remaining · 1,520 · of 3,000, resets Nov 23"

When the figure is zero or missing, say so in plain words: "0 active", "All quiet", "Never", "Nothing scheduled", "None". Do not show a dash where a word would tell the person something.

### Empty states
Three kinds, and they are written differently.

| Kind | Title | Line | Action |
|---|---|---|---|
| Nothing yet (first use) | "No monitors yet" | "Watch a page and get a webhook when it changes." | "New monitor" |
| Nothing matches (filtered) | "No activity in this range" | "Try a different date range, endpoint or API key." | "Clear filters" |
| Nothing possible (blocked) | "Logs are off" | "Zero data retention is on for this team, so requests are not stored." | "Open settings" |

Say what will appear and how to make it appear. Do not apologise, do not say "Oops", and do not describe the emptiness ("There is nothing here").

### Loading and progress
Name what is happening, in the present tense, with the object: "Searching the web", "Reading 4 pages", "Parsing page 3 of 12". Bare "Loading…" is for when you truly do not know. Where the wait has a length, say it: "About 20 seconds left".

### Success
Say what is now true, and nothing else. "Key created", "Copied", "Invite sent to dana@quarry.dev". Drop "successfully": if it had failed, you would be showing an error.

### Errors
An error answers two questions: what happened, and what should I do. Lead with the first, end with the second, and include whatever a person would need to get help.

| Write | Not |
|---|---|
| "Couldn't reach docs.example.com. Check the URL, or try again in a minute." | "Something went wrong. Please try again later." |
| "You're out of credits. They reset Nov 23, or upgrade to keep going." | "Error 402: Payment Required" |
| "This page took longer than 60 seconds. Raise the timeout or try a smaller page. Request ID `req_8f2a`" | "Request failed" |

Never blame the person ("You entered an invalid URL"), and never show a raw code as the whole message. The code can follow, in mono.

### Confirmations
Only confirm what cannot be undone or costs money. The title is the action as a question, the body says exactly what will be lost, and the button repeats the verb.

- Title: "Delete Quarry Labs?"
- Body: "This removes the team, its 3 API keys and 30 days of logs. It can't be undone."
- Buttons: "Cancel" · "Delete team"

If the action can be undone, do it and offer "Undo" in a toast instead of asking first.

### Callouts and banners
A callout interrupts, so it is only for something the person must know now: a limit about to be hit, a payment that failed, a setting with a side effect. One title, up to two sentences, at most one action. Standing information belongs in a description or a hint, not a callout. A screen with three callouts has none.

### Tooltips
Two uses only: the name of an icon-only control ("Copy key"), and a short definition of a term or abbreviation ("ZDR: zero data retention"). A tooltip never carries anything a person must read to finish the task, because it is invisible on touch screens and to anyone not hovering.

## 5. Help text: when to add it and where it goes

The pull is always to add a sentence "to be safe". Most of the time the sentence makes the screen worse. Add help only when one of these is true:

- A careful first-time user would probably get it wrong.
- The consequence is money, security, or something that cannot be undone.
- The term is ours, not theirs, and cannot be renamed.

Then choose the lightest place that works, in this order.

| Place | Use it for | Always visible |
|---|---|---|
| The label or the value itself | Renaming the thing so no help is needed | Yes |
| A placeholder or pre-filled example | Showing the format | Yes |
| A hint under the field | One fact needed to answer correctly | Yes |
| A section description | What the group is for | Yes |
| A tooltip | A definition, or the name of an icon | No |
| A "Learn more" link at the end of a line | Background and edge cases | One click |
| A callout | Something that needs attention now | Yes, and loud |
| The docs | How it works, in full | Elsewhere |

Start at the top. Most help text can be deleted by fixing the label above it: a field called "Slug" with a two-line explanation is better as a field called "URL name" with none.

**Where long text is right.** Money, security, legal terms and irreversible actions deserve complete sentences, because a short version would mislead. Billing rules, what happens when a plan changes, what a deletion removes, how a secret must be stored. Even then: short sentences, the consequence first, numbers instead of adjectives, and set as quiet small text beside the thing it explains, not as a headline or a banner.

## 6. Voice

- **Plain.** The word a person would say. "Use", not "utilise". "Start", not "initiate". "Stop", not "terminate".
- **Specific.** Numbers, names, dates, examples. "3 keys", "Nov 23", "about 2 seconds".
- **Direct.** Second person and active voice: "You have 1,520 credits", "We'll email you a link". Present tense.
- **Calm.** No exclamation marks, no "Oops", no "Awesome", no "Please" or "Sorry" as padding. One "sorry" is right when we broke something.
- **Honest.** Say what will happen, including the cost, before it happens: "Costs 1 credit."
- **The user's terms.** Developers think in endpoints, keys, credits, requests and status codes; use those words, in mono where they are literal. Do not invent product names for ordinary things.

Words to delete on sight: *simply, just, easily, quickly, successfully, please note, in order to, you can, allows you to, is used to, basically, actually, very*.

## 7. Mechanics

- **Case.** Sentence case everywhere: "API keys", "Activity logs", "Create key". Uppercase only for mono eyebrows and stat labels, which the styles do for you.
- **Full stops.** Titles, labels, buttons, badges, table headers and tooltips have none. Descriptions, hints, errors and empty-state lines are sentences and end with one.
- **Numbers.** Always digits, with thousands separators and the unit: "1,520 credits", "842 ms", "3 of 12". Tabular figures in tables.
- **Dates and times.** Short and unambiguous: "Nov 23", "Feb 10, 2026 4:29 PM". Relative for the recent past: "2 minutes ago". Say the time zone once where it matters: "Dates use UTC."
- **Identifiers.** Keys, IDs, paths, endpoints, file names, code and units of code are mono. Never translate or reword them.
- **Lists in a sentence.** "PDF, DOCX and XLSX".
- **Links.** The link text says where it goes: "billing settings", "Webhook security". Never "click here" or a bare "Learn more" with nothing before it.
- **Truncation.** Write so the important word comes first. "Monthly limit" survives being cut; "Limit for the month" does not.

**One name per thing.** Pick the word and use it everywhere, in the interface, the docs and the API.

| Verb | Means |
|---|---|
| Create | Make a new object that did not exist ("Create key") |
| New | The toolbar button that starts creating ("New monitor") |
| Add | Attach something that already exists ("Add member", "Add a card") |
| Remove | Detach it; the thing still exists elsewhere |
| Delete | Destroy it for good |
| Revoke | End access (keys, tokens, connected apps) |
| Save | Keep changes to something that exists |
| Run / Start / Stop | Begin or end work that takes time |
| Cancel | Leave without doing the action |
| Close / Dismiss | Hide something that needs no decision |

## 8. Agent and AI screens

- **The prompt field's placeholder is an example task**, concrete enough to copy: "Every pricing tier on linear.app and notion.so". Not "Ask me anything".
- **Suggestions are real requests**, each different in kind, each short enough to read at a glance.
- **Say what the agent is doing, as it does it**, in the same plain verbs: "Searching", "Reading 4 pages", "Comparing prices". Past tense when done: "Read 4 pages".
- **Show cost and limits before the run**, not after: "Costs about 12 credits", "5 free runs left today".
- **State uncertainty plainly.** "Couldn't find a price for the Enterprise tier." Not a confident guess, and not an apology.
- **Sources are named**, not described: the site and the page title.
- **The agent speaks as the product**, in the same voice as the rest of the interface. It does not chat, flatter or narrate its feelings.

## 9. Check before you ship

1. Can a person tell what this screen is for from the title and one line?
2. Does every button say what it does, without reading the text around it?
3. Is anything said twice? Delete one.
4. Is there a sentence that only restates a label or a title? Delete it.
5. Is every adjective a fact?
6. Is every element inside its budget (section 3)?
7. Does each empty state say what will appear and offer the action?
8. Does each error say what happened and what to do?
9. Is help text in the lightest place that works (section 5)?
10. Is the same thing called the same name everywhere?
11. Sentence case, no stray full stops, digits with units, mono identifiers?
12. Read the screen aloud, top to bottom. Does it sound like one person explaining it plainly?

## 10. Instructions for an AI agent

Paste this into the project's agent instructions with the block from `GUIDE.md`.

```markdown
## UI copy: follow WRITING.md

- Read `fire-docs/WRITING.md` before writing any text that appears in the interface.
- Write for the gaps only: if the layout, a label or a value already says it, do not write it.
- One job per element. Stay inside the word budgets in section 3. If a text is over budget, split it
  or move the detail to a tooltip, a "Learn more" link or the docs.
- Buttons are a verb, or a verb and its object. Placeholders are realistic examples. Hints say one
  thing: the effect, the default, the limit or an example.
- Empty states say what will appear and how. Errors say what happened and what to do. Success says
  what is now true, without "successfully".
- Sentence case. Digits with units. Identifiers in mono. No exclamation marks, no "please", "simply",
  "just", "easily", "Oops".
- Do not add explanatory sentences "to be safe". Add help only for money, security, irreversible
  actions, or a mistake a careful first-time user would make.
- Before finishing, run the checklist in section 9 on every screen you touched and fix what fails.
```
