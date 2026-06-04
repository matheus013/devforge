from __future__ import annotations


def estimate_project_price(project, complexity: str = "moderate") -> dict:
    tiers = {"simple": 1500, "moderate": 4500, "complex": 9000, "enterprise": 18000}
    base = tiers.get(complexity, 4500)
    return {"setup": base, "monthly": round(base * 0.12), "currency": "USD"}
