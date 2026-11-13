<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Estimations, estimation defects, invoices, repairs, repair items and repair status history are written only by server functions using the admin client after tenant checks; authenticated users have no INSERT grant, so prices and totals can never come from the browser.
- REP/FA references come from the `next_shop_reference` database function (atomic per-shop yearly counter in `shop_sequences`); never compute them in app code.
- Base-price priority lives in `resolveBasePrice` (src/lib/pricing.ts), shared by the estimate page and the server; covered by `src/lib/pricing.test.ts` (`bun run test`).
- Market analysis uses the single pure `computeProfit` module; persist entered inputs rather than derived margins so calculations remain consistent across both resale scenarios.
- user_metadata is never trusted for shop attachment or roles: `inviteMember` pre-writes `profiles`/`user_roles` server-side before first login, and `ensureWorkspaceFor` only reuses that server-written profile, otherwise it creates a new shop owned by the caller.
- Profile identity and shop membership are immutable in the database; invitations insert new profiles/roles, never upsert existing membership, and role checks bind roles to the profile's shop to prevent tenant reassignment.
- Repair status workflow and invoice eligibility live in `canChangeStatus` / `INVOICEABLE_STATUSES` (src/lib/repairs.ts), enforced by the server with a compare-and-set on the previous status; the UI only mirrors them.

- Business access requires authentication, shop membership and existing role checks only; no payment dependency remains. Historical payment tables and applied migrations are retired but retained to preserve data and migration history.
- Repair detail uses the shared RepairLabelPrint and DepositTicketPrint dialogs; dashboard and repair list reuse ScanSearch, keeping printing and tenant-scoped reference lookup consistent.
- Sitemap URLs are derived from the router with a required staticData.sitemap decision on every route; exclude the authenticated subtree, account-recovery pages and secret tracking links to avoid exposing private destinations, and omit lastmod without authoritative page-specific timestamps.
- Global administration uses a separate verified-owner role and dedicated server functions; mutations and audit events are atomic in a guarded RPC, while restrictive RLS and requireBusinessAccess enforce reversible suspensions without broadening tenant permissions.
- Owner Analytics uses an owner-guarded RPC for aggregates, Paris-calendar periods, minimal database-triggered business events and server-scoped daily presence; this avoids exposing tenant data or fabricating historical visits, while URL filters keep comparisons reproducible.
- TikTok attribution emits an allowlisted campaign event from the existing landing page into the injected analytics runtime; visits use distinct analytics session IDs, never another page-view event or a database counter.
