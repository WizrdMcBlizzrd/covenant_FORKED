# Maison Theme: Relevant Files Only

Use this file list if you want to move only the clean-site changes into another repository.

## Required files

- `config/store.yml` (theme switch to `maison`)
- `app/assets/stylesheets/application.maison.tailwind.css`
- `app/themes/maison/layout.html`
- `app/themes/maison/home.html`
- `app/themes/maison/inscriptions.html`
- `app/themes/maison/inscription.html`
- `app/themes/maison/activity.html`
- `app/themes/maison/policy.html`
- `app/themes/maison/launchpad.html`
- `app/themes/maison/launchpad_sales.html`
- `app/themes/maison/launchpad_progress.html`
- `app/themes/maison/partials/inscription-card.html`
- `app/themes/maison/partials/order.html`

## Optional (if you also want process docs)

- `docs/maison-relevant-files.md`

## Copy-only command

From the Covenant repo root, copy only the theme payload into another repo directory:

```bash
TARGET_REPO=/path/to/Blizrds
mkdir -p "$TARGET_REPO/app/themes/maison" "$TARGET_REPO/app/assets/stylesheets" "$TARGET_REPO/config" "$TARGET_REPO/docs"
cp config/store.yml "$TARGET_REPO/config/store.yml"
cp app/assets/stylesheets/application.maison.tailwind.css "$TARGET_REPO/app/assets/stylesheets/"
cp app/themes/maison/*.html "$TARGET_REPO/app/themes/maison/"
mkdir -p "$TARGET_REPO/app/themes/maison/partials"
cp app/themes/maison/partials/*.html "$TARGET_REPO/app/themes/maison/partials/"
cp docs/maison-relevant-files.md "$TARGET_REPO/docs/"
```
