# servitola.github.io

Personal blog on GitHub Pages, built by Pages' own Jekyll (3.x) on push to `main`. No Actions, no Gemfile.

## The rule

Every word of prose here is typed by servitola's own hands. The only exception is code he copy-pastes.

Agents never write, rewrite, translate, "polish", or suggest wording for a post, a title, a description,
or any other text a reader sees. This includes `_drafts/`, front matter `title`/`description`, and the
footer. `.claude/settings.json` denies Edit/Write on `_posts/` and `_drafts/` to make this mechanical.

Agents may: change layouts, CSS, config, and fix broken Markdown syntax or front matter structure when
asked; point out a typo or a factual error by quoting it in chat, leaving the fix to him; produce code
snippets in chat for him to paste.

## Writing a post

File `_posts/YYYY-MM-DD-slug.md`:

```
---
title: Заголовок
---
```

Add `lang: en` to the front matter for an English post. Unfinished texts go to `_drafts/slug.md` (no date,
not published). Local preview: `jekyll serve --drafts` (gem installed with `--user-install`).
