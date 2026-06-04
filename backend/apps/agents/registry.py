from __future__ import annotations

import os
from dataclasses import asdict, dataclass

ALLOWED_RUNNERS = ["codex", "claude-code"]

LOCAL_AGENT_MODE = os.getenv("DEVFORGE_AGENT_MODE", "local_operator")
LOCAL_AGENT_RUNNER = os.getenv("DEVFORGE_AGENT_RUNNER", "codex")

if LOCAL_AGENT_RUNNER not in ALLOWED_RUNNERS:
    raise ValueError(
        f"DEVFORGE_AGENT_RUNNER must be one of {ALLOWED_RUNNERS}, got '{LOCAL_AGENT_RUNNER}'"
    )


@dataclass(frozen=True)
class LocalAgent:
    key: str
    name: str
    skill: str
    role: str
    mode: str
    runner: str
    enabled: bool = True


LOCAL_AGENTS = [
    LocalAgent(
        key="codex_operator",
        name="Codex Local Operator",
        skill="codex-local-operator",
        role="Receives local handoffs and acts in this workspace with audited AgentRuns.",
        mode=LOCAL_AGENT_MODE,
        runner="codex",
    ),
    LocalAgent(
        key="claude_code_operator",
        name="Claude Code Local Operator",
        skill="claude-code-local-operator",
        role=(
            "Receives local handoffs and acts in this workspace via Claude Code CLI "
            "with audited AgentRuns."
        ),
        mode=LOCAL_AGENT_MODE,
        runner="claude-code",
    ),
    LocalAgent(
        key="planner",
        name="Project Planner",
        skill="project-planner",
        role="Turns briefs into plans, roadmap stages, and acceptance criteria.",
        mode=LOCAL_AGENT_MODE,
        runner=LOCAL_AGENT_RUNNER,
    ),
    LocalAgent(
        key="complexity",
        name="Complexity Classifier",
        skill="complexity-classifier",
        role="Classifies risk and complexity signals for triage.",
        mode=LOCAL_AGENT_MODE,
        runner=LOCAL_AGENT_RUNNER,
    ),
    LocalAgent(
        key="import_analyzer",
        name="Import Analyzer",
        skill="import-analyzer",
        role="Assesses imported repositories without executing imported code.",
        mode=LOCAL_AGENT_MODE,
        runner=LOCAL_AGENT_RUNNER,
    ),
    LocalAgent(
        key="ticket_triage",
        name="Ticket Triage",
        skill="ticket-triage",
        role="Creates tickets from project and message signals.",
        mode=LOCAL_AGENT_MODE,
        runner=LOCAL_AGENT_RUNNER,
    ),
    LocalAgent(
        key="change_request_refiner",
        name="Change Request Refiner",
        skill="change-request-refiner",
        role="Turns unclear client change requests into actionable prompts and questions.",
        mode=LOCAL_AGENT_MODE,
        runner=LOCAL_AGENT_RUNNER,
    ),
]


def configured_agents() -> list[dict]:
    return [asdict(agent) for agent in LOCAL_AGENTS if agent.enabled]


def active_runner() -> str:
    return LOCAL_AGENT_RUNNER


def agent_log_context(skill: str) -> str:
    agent = next((item for item in LOCAL_AGENTS if item.skill == skill), None)
    if not agent:
        return f"runner={LOCAL_AGENT_RUNNER}; mode={LOCAL_AGENT_MODE}"
    return f"agent={agent.key}; runner={agent.runner}; mode={agent.mode}"
