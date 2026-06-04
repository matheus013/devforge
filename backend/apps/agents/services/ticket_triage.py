from __future__ import annotations


def maybe_create_ticket(*, project, reason: str, signal: dict):
    if not signal.get("requires_ticket") and signal.get("priority") != "high":
        return None
    from apps.tickets.models import Ticket

    return Ticket.objects.create(
        organization=project.organization,
        project=project,
        title=f"Validar risco detectado: {reason}",
        description=f"Sinal automatico capturado pelo agente: {signal}",
        priority=signal.get("priority", "normal"),
        status=Ticket.Status.OPEN,
        source="agent",
    )
