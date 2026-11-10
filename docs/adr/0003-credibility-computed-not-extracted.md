# Credibility is computed by rule, never by the model

The model extracts only the inputs (Source type, Speaker role, first-hand or not); Credibility is computed from them in code. A model-assigned rating would be inconsistent between runs and untestable, and changing the rule would require re-extracting every Capture. Computed this way, the rule can change freely and applies to all existing Insights at once.
