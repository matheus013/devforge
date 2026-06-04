from __future__ import annotations

import unicodedata

from apps.agents.models import AgentRun
from apps.agents.registry import agent_log_context

CHANGE_TERMS = [
    "alterar",
    "alteracao",
    "ajustar",
    "ajuste",
    "mudar",
    "mudanca",
    "incluir",
    "adicionar",
    "remover",
    "trocar",
    "melhorar",
    "corrigir",
]

URGENT_TERMS = ["urgente", "hoje", "agora", "critico", "parado", "bloqueado", "erro"]


def _priority_for_message(message: str) -> str:
    lowered = _normalized(message)
    if any(term in lowered for term in URGENT_TERMS):
        return "high"
    if any(term in lowered for term in CHANGE_TERMS):
        return "normal"
    return "low"


def _intent_for_message(message: str) -> str:
    lowered = _normalized(message)
    if any(term in lowered for term in ["erro", "corrigir", "bug", "falha"]):
        return "correcao"
    if any(term in lowered for term in ["adicionar", "incluir", "novo", "nova"]):
        return "nova_funcionalidade"
    if any(term in lowered for term in ["melhorar", "ajustar", "mudar", "alterar"]):
        return "melhoria"
    return "esclarecimento"


def _normalized(message: str) -> str:
    return (
        unicodedata.normalize("NFD", message.lower())
        .encode("ascii", "ignore")
        .decode("ascii")
    )


def _token_estimate(text: str) -> dict:
    input_tokens = max(1, len(text.split()))
    output_tokens = 90
    return {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": input_tokens + output_tokens,
        "source": "estimated",
    }


def refine_change_request(*, project, raw_message: str, requested_by) -> AgentRun:
    intent = _intent_for_message(raw_message)
    priority = _priority_for_message(raw_message)
    refined_prompt = (
        f"Analise a solicitacao de alteracao do cliente para o projeto {project.name}. "
        f"Objetivo bruto do cliente: {raw_message.strip()} "
        "Transforme isso em requisitos claros, impactos no escopo, riscos, perguntas de "
        "confirmacao e tickets de execucao. Preserve a intencao do cliente e evite "
        "assumir detalhes nao informados."
    )
    clarification_questions = [
        "Qual resultado final o cliente espera ver na aplicacao?",
        "Essa alteracao deve entrar na entrega atual ou em uma nova fase?",
        "Existe prazo, regra de negocio ou impacto financeiro envolvido?",
    ]
    token_usage = _token_estimate(raw_message)
    output = {
        "intent": intent,
        "priority": priority,
        "refined_prompt": refined_prompt,
        "summary": (
            "Pedido refinado para o time: confirmar escopo, impacto e prioridade antes "
            "de executar a alteracao."
        ),
        "clarification_questions": clarification_questions,
        "suggested_next_steps": [
            "Validar entendimento com o cliente.",
            "Converter o refinamento em tickets de alteracao.",
            "Executar com agente local apenas apos aprovacao do escopo ajustado.",
        ],
        "token_usage": token_usage,
    }
    return AgentRun.objects.create(
        organization=project.organization,
        project=project,
        skill="change-request-refiner",
        status="completed",
        input={
            "project_id": project.id,
            "project_name": project.name,
            "raw_message": raw_message,
            "requested_by": requested_by.email,
        },
        output=output,
        provider="codex-local-operator",
        model_name="deterministic-change-request-refiner",
        input_tokens=token_usage["input_tokens"],
        output_tokens=token_usage["output_tokens"],
        total_tokens=token_usage["total_tokens"],
        token_usage_source=token_usage["source"],
        currency="USD",
        estimated_cost="0.05",
        logs=[
            agent_log_context("change-request-refiner"),
            "Mensagem do cliente refinada para prompt operacional.",
            "Token usage estimado porque o MVP usa agente deterministico.",
        ],
    )
