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

- Keep the persistent Node MQTT/SQLite gateway under gateway/ isolated from the TanStack import graph; it runs on a separate long-lived Node host.
- Scope every gateway history query, socket room, snapshot and command to its simulated flag so test hardware cannot contaminate physical readings.
- Treat device ACKs, not MQTT publish callbacks or HTTP acceptance, as command completion; ignore retained commands and unmatched acknowledgements.
- Use a configurable Nitro preset for re-hosting while preserving the default Lovable deployment target.
- Keep hardware credentials and calibration in local ignored configuration; firmware must remain stopped until configured and explicitly started.
