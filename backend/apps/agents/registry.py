from __future__ import annotations

import os
from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class LocalAgent:
    key: str
    name: str
    skill: str
    role: str
    mode: str
    provider: str
    enabled: bool = True


LOCAL_AGENT_MODE = os.getenv("DEVFORGE_AGENT_MODE", "codex_operator")
LOCAL_AGENT_PROVIDER = os.getenv("DEVFORGE_AGENT_PROVIDER", "codex-local-operator")

LOCAL_AGENTS = [
    LocalAgent(
        key="codex_operator",
        name="Codex Local Operator",
        skill="codex-local-operator",
        role="Receives local handoffs and acts in this workspace with audited AgentRuns.",
        mode=LOCAL_AGENT_MODE,
        provider=LOCAL_AGENT_PROVIDER,
    ),
    LocalAgent(
        key="planner",
        name="Project Planner",
        skill="project-planner",
        role="Turns briefs into plans, roadmap stages, and acceptance criteria.",
        mode=LOCAL_AGENT_MODE,
        provider=LOCAL_AGENT_PROVIDER,
    ),
    LocalAgent(
        key="complexity",
        name="Complexity Classifier",
        skill="complexity-classifier",
        role="Classifies risk and complexity signals for triage.",
        mode=LOCAL_AGENT_MODE,
        provider=LOCAL_AGENT_PROVIDER,
    ),
    LocalAgent(
        key="import_analyzer",
        name="Import Analyzer",
        skill="import-analyzer",
        role="Assesses imported repositories without executing imported code.",
        mode=LOCAL_AGENT_MODE,
        provider=LOCAL_AGENT_PROVIDER,
    ),
    LocalAgent(
        key="ticket_triage",
        name="Ticket Triage",
        skill="ticket-triage",
        role="Creates tickets from project and message signals.",
        mode=LOCAL_AGENT_MODE,
        provider=LOCAL_AGENT_PROVIDER,
    ),
    LocalAgent(
        key="change_request_refiner",
        name="Change Request Refiner",
        skill="change-request-refiner",
        role="Turns unclear client change requests into actionable prompts and questions.",
        mode=LOCAL_AGENT_MODE,
        provider=LOCAL_AGENT_PROVIDER,
    ),
]


def configured_agents() -> list[dict]:
    return [asdict(agent) for agent in LOCAL_AGENTS if agent.enabled]


def agent_log_context(skill: str) -> str:
    agent = next((item for item in LOCAL_AGENTS if item.skill == skill), None)
    if not agent:
        return f"provider={LOCAL_AGENT_PROVIDER}; mode={LOCAL_AGENT_MODE}"
    return f"agent={agent.key}; provider={agent.provider}; mode={agent.mode}"
