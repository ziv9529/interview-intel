# Captures are immutable; status is derived from Extraction Runs

A Capture row is written once and never updated, so it has no `status` column. Whether a Capture is pending, extracted or failed is derived from its `extraction_runs` rows (outcome succeeded/failed), and only the latest successful run's Insights are current. This keeps the raw material safe to re-extract whenever the prompt, schema or model changes, and lets the database double as the work queue: the cron sweeps Captures with no successful run, so no separate queue is needed at this volume.
