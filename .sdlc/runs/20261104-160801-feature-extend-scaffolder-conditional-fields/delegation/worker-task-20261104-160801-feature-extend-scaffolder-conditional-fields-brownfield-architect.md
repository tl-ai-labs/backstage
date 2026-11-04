Changes asked for this step:

plan-to-packets --spec exited 1 with:

Error: no unit covers AC-5 (requirements.md): add the id to the covers of the unit that implements it, and check that section again

Per the user's Gate 2 item 5, AC-5 is the final check, not a test unit's. The final project check (`test-typecheck-lint`) runs as the end-of-run check on the last packet, U14. So add AC-5 to U14's covers (U14: FR-9, NFR-4, AC-7, AC-5), and check that section again with plan-lint --section. Do not add AC-5 to U07 or U09-U12, and change nothing else.

Edit the pieces you handed in and hand each changed one in again.