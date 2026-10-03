"""Return Engine — web interface for the PortfolioService engine."""

from __future__ import annotations

from flask import Flask, jsonify, render_template, request

from asa import PortfolioService

app = Flask(__name__)
service = PortfolioService()

EXAMPLE_PAYLOAD = {
    "initial_price": 80.00,
    "final_price": 88.00,
    "dividend": 3.50,
    "shares": 100,
}


def _as_float(value, default=None):
    if value is None or value == "":
        if default is None:
            raise KeyError("missing numeric field")
        return float(default)
    return float(value)


def _as_int(value, default=None):
    if value is None or value == "":
        if default is None:
            raise KeyError("missing integer field")
        return int(default)
    return int(float(value))


def _normalize_payload(raw: dict) -> dict:
    return {
        "initial_price": _as_float(raw.get("initial_price")),
        "final_price": _as_float(raw.get("final_price")),
        "dividend": _as_float(raw.get("dividend"), 0.0),
        "shares": _as_int(raw.get("shares"), 1),
    }


@app.get("/")
def index():
    return render_template("index.html", example=EXAMPLE_PAYLOAD)


@app.get("/api/example")
def example():
    return jsonify(EXAMPLE_PAYLOAD)


@app.post("/api/analyze")
def analyze():
    raw = request.get_json(silent=True) or {}
    try:
        payload = _normalize_payload(raw)
    except (KeyError, TypeError, ValueError) as error:
        return jsonify({"status": "ERROR", "message": str(error)}), 400

    response = service.process_investment_analysis(payload)
    status_code = 200 if response.get("status") == "SUCCESS" else 400
    return jsonify(response), status_code


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5050, debug=True)
