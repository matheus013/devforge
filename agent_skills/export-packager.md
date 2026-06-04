# EXPORT-PACKAGER

Objective: prepare a project for standalone code export.

Inputs: project, approval state, repository metadata, packaging rules.

Process: verify export approval, collect files, create package metadata, generate handoff checklist.

Output: package URL, manifest, export audit record.

Rules: admin approval is required before package release.

Common errors: exporting unapproved projects, leaking secrets, missing manifest.

Quality criteria: exported package is reproducible and auditable.
