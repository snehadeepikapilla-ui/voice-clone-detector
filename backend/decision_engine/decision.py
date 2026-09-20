def make_decision(ai_probability: float) -> dict:
    """
    Convert AI probability into a clear detection decision.
    """

    if ai_probability >= 70:
        risk_level = "High Risk"
        result = "Potential AI-generated voice"
        recommended_action = "Block or request additional verification."

    elif ai_probability >= 50:
        risk_level = "Medium Risk"
        result = "Suspicious voice"
        recommended_action = "Perform additional verification."

    else:
        risk_level = "Low Risk"
        result = "Likely human voice"
        recommended_action = "Voice appears natural."

    return {
        "result": result,
        "ai_clone_probability": round(ai_probability, 2),
        "risk_level": risk_level,
        "recommended_action": recommended_action
    }