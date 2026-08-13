# GIRPACK Launch Film — storyboard

60s · 1920×1080 · 30fps · LEWIX brand · no client data on screen

Cut to a 120bpm grid: 1 beat = 0.5s, 1 bar = 2s, 30 bars total. Every scene boundary
lands on a bar, so a track can be dropped in later without re-timing anything.

Copy follows the brand voice rules: concrete, engineering-first, no hype words, **no em
dashes** (per `LewixSocials/03-Quick-Reference/bio-copy.md`).

| # | Time | Bars | Scene | On screen | Copy |
|---|---|---|---|---|---|
| 01 | 0:00–0:06 | 1–3 | Cold open | LEWIX logomark scales in through a blur, supergraphic drifting behind, gradient rule wipes out | `LEWIX PRESENTS` |
| 02 | 0:06–0:14 | 4–7 | The problem | 6×5 spreadsheet grid staggers in; one cell is red and pulses; grid drains away | `Pricing lived in spreadsheets.` / `One wrong cell moved every price.` |
| 03 | 0:14–0:20 | 8–10 | Product reveal | GIRPACK sets in Figtree Bold, purple→cyan gradient bar wipes under it | `GIRPACK` / `Pricing, costing, and the full order lifecycle. One system.` |
| 04 | 0:20–0:32 | 11–16 | Pricing engine | Costing panel; 4 product rows slide in; `cost x 1.18` formula chip pops and glows; 3 supplier bars grow, best one in cyan | `Formula driven pricing.` / `Every cost, every supplier, every change, logged.` |
| 05 | 0:32–0:44 | 17–22 | Order lifecycle | Connector line draws on; 6 stage pills pop in; a cyan marker travels the pipeline, each pill turning blue as it passes | `Quotation to delivery. One pipeline.` / `Every transition is atomic, and written to the audit log.` |
| 06 | 0:44–0:52 | 23–26 | Sync + control | Two cards, a one-way cyan arrow draws from ACCOUNTING to GIRPACK; four role chips pop in | `Reads the accounting system.` / `Never writes to it.` / `Four roles. Page level permissions. Optional two factor.` |
| 07 | 0:52–1:00 | 27–30 | Close | Three stat counters run up, LEWIX lockup resolves through a blur | `878 PRODUCTS PRICED` · `27 SUPPLIERS TRACKED` · `6 PIPELINE STAGES` / `Transcending the Industry` / `lewix.ai` |

## Why this content

Every claim on screen is something the system actually does, taken from Girpack's README
and STATUS.md rather than invented:

- **Formula driven pricing** — configurable per-product bottom-price formulas (percentage of
  cost, percentage of total, fixed markup, manual override)
- **Supplier comparison** — multi-supplier cost comparison with best-price highlighting
- **6-stage pipeline** — quotation → pricing approval → purchasing → packing → delivery →
  completion
- **Atomic transitions + audit log** — status transitions were rewritten as conditional
  `updateMany` inside a `$transaction`, verified with concurrent approve calls
- **Read only accounting sync** — the SQL Account integration is GET-only against the
  client's production accounting database, which is the single loudest rule in the repo
- **Four roles, page permissions, optional 2FA** — Manager / Site Admin / Admin / Sales with
  granular per-page checkboxes and TOTP

## Design system

| Token | Value | Use |
|---|---|---|
| Deep Night | `#09090c` | base background |
| Panel | `#14141f` | cards, table rows |
| Hairline | `#262633` | borders, inactive states |
| Horizon Blue | `#6880f2` | primary accent, active pipeline stage |
| Deep Purple | `#8151df` | gradient origin |
| Cyan | `#67e1f9` | highlight, best price, read-only arrow, URL |
| Alert | `#e0574f` | the one broken spreadsheet cell (functional only, not a brand colour) |

Type: **Figtree** for headlines, **Urbanist** for body and all-caps labels. Both installed
per-user on 2026-08-13 as variable fonts.

## Numbers to check before rendering

`CFG.stats` in `build.jsx` currently reads 878 products / 27 suppliers / 6 stages. The first
two came from the Girpack catalog and should be re-confirmed against production before this
goes public, or swapped for something that does not date.

## Not included

- Audio. The film is cut to the grid above and exports silent by design.
- Real screen captures. Every "UI" on screen is native AE shape and text layers, so no
  customer name, price, or order number is ever rendered.
- A 9:16 cutdown. The scene comps are separate, so a vertical version is a re-layout of the
  same 7 comps rather than a rebuild.
