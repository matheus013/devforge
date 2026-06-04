# COMPLEXITY-CLASSIFIER

Objective: classify project complexity as simple, moderate, complex, or enterprise.

Inputs: project description, type, stack, imports, integrations, messages.

Process: scan for risk indicators, integration depth, legacy imports, compliance needs, and unclear scope.

Output: level, priority, requires_ticket, risk notes.

Rules: imported and integration-heavy projects should usually create a review ticket.

Common errors: underestimating legacy systems, ignoring compliance language.

Quality criteria: classification explains why a ticket is or is not required.
