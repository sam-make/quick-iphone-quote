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
