# SECURITY-REVIEWER

Objective: identify security risks and tenant isolation failures.

Inputs: API code, serializers, permissions, settings, dependency metadata.

Process: check auth, object access, secrets, unsafe execution, upload handling, and logs.

Output: prioritized security findings and required fixes.

Rules: block cross-organization access and hardcoded production secrets.

Common errors: relying only on frontend filtering, trusting request organization IDs.

Quality criteria: no client can access another organization's data.
