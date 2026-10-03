class InvestmentInput:
    """Validates and encapsulates raw investment payload data."""
    def __init__(self, initial_price: float, final_price: float, dividend: float = 0.0, shares: int = 1):
        if initial_price <= 0:
            raise ValueError("Initial price must be greater than zero.")
        if final_price < 0:
            raise ValueError("Final price cannot be negative.")
        if dividend < 0:
            raise ValueError("Dividend cannot be negative.")
        if shares <= 0:
            raise ValueError("Shares must be greater than zero.")
        
        self.initial_price = initial_price
        self.final_price = final_price
        self.dividend = dividend
        self.shares = shares


class ReturnMetricsOutput:
    """Container for calculated financial return metrics."""
    def __init__(self):
        self.capital_gain_return = 0.0
        self.dividend_yield = 0.0
        self.total_return_rate = 0.0
        self.gross_return = 0.0
        self.total_return_amount = 0.0


class ReturnEngine:
    """Core mathematical engine implementing investment return models."""
    def calculate_metrics(self, input_data: InvestmentInput) -> ReturnMetricsOutput:
        v0 = input_data.initial_price
        vf = input_data.final_price
        div = input_data.dividend
        n = input_data.shares
        
        # Core financial calculations (Equation 2.2 logic)
        capital_gain_return = (vf - v0) / v0
        dividend_yield = div / v0
        total_return_rate = capital_gain_return + dividend_yield
        
        # Additional ratios
        gross_return = vf / v0
        total_return_amount = (vf - v0 + div) * n
        
        # Package into output object
        result = ReturnMetricsOutput()
        result.capital_gain_return = capital_gain_return
        result.dividend_yield = dividend_yield
        result.total_return_rate = total_return_rate
        result.gross_return = gross_return
        result.total_return_amount = total_return_amount
        
        return result


class PortfolioService:
    """Service layer coordinating validation, calculations, and interface formatting."""
    def __init__(self):
        self.engine = ReturnEngine()
        
    def process_investment_analysis(self, raw_payload: dict) -> dict:
        try:
            # Step A: Parse and validate input data
            validated_input = InvestmentInput(
                initial_price=raw_payload["initial_price"],
                final_price=raw_payload["final_price"],
                dividend=raw_payload.get("dividend", 0.0),
                shares=raw_payload.get("shares", 1)
            )
            
            # Step B: Execute calculations via engine
            metrics = self.engine.calculate_metrics(validated_input)
            
            # Step C: Format response payload for API or UI consumption
            return {
                "status": "SUCCESS",
                "data": {
                    "capital_gain_return_pct": round(metrics.capital_gain_return * 100, 4),
                    "dividend_yield_pct": round(metrics.dividend_yield * 100, 4),
                    "total_return_rate_pct": round(metrics.total_return_rate * 100, 4),
                    "gross_return_pct": round(metrics.gross_return * 100, 4),
                    "total_dollar_return": round(metrics.total_return_amount, 2)
                }
            }
            
        except (KeyError, ValueError, TypeError) as error:
            return {
                "status": "ERROR",
                "message": str(error)
            }


# ==========================================
# Execution Hook / Example Test
# ==========================================
if __name__ == "__main__":
    # Test Payload
    payload = {
        "initial_price": 80.00,
        "final_price": 88.00,
        "dividend": 3.50,
        "shares": 100
    }
    
    service = PortfolioService()
    response = service.process_investment_analysis(payload)
    
    import json
    print(json.dumps(response, indent=4))
	