Changes asked for this step:

Gate 1 revise (from the user, verbatim): "FR-3 stops the route resolver throwing for every caller, including after the app is finalized, which the brief does not ask for. The brief only needs root elements not to crash before finalization."
Edit requirements.md accordingly: narrow FR-3 (and IS-3, the Diagnosis/acceptance wording that depends on it) so the change only covers root elements not crashing before finalization; RouteResolver's existing throw behavior for callers after finalization must stay as it is. Keep every other section unchanged unless it depends on FR-3.

Edit the pieces you handed in and hand each changed one in again.