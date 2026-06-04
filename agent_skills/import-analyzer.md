# IMPORT-ANALYZER

Objective: analyze an existing project import without executing code.

Inputs: Git URL, ZIP metadata, file tree, dependency manifests.

Process: detect stack, frameworks, dependency risk, secrets indicators, and migration complexity.

Output: stack, frameworks, risks, score, recommendation.

Rules: never run imported code in the MVP.

Common errors: trusting repository metadata, ignoring lockfiles, executing scripts.

Quality criteria: assessment is useful for migration planning and safe by default.
