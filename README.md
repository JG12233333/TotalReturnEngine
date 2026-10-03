# Return Engine

A single-holding total-return desk. You enter a starting price, an ending price, a dividend per share, and a share count. The engine splits the result into price change and income, then the page shows the rate, the dollar result, and the position path.

## What it calculates

Holding return is price appreciation plus income, both measured against the price you paid:

```
R = (Vf − V0) / V0  +  D / V0
```

| Symbol | Input | Meaning |
| --- | --- | --- |
| `V0` | Initial price | Price per share at the start. Must be greater than 0. |
| `Vf` | Final price | Price per share at the end. May be 0. |
| `D` | Dividend | Cash income per share over the period. Defaults to 0. |
| `N` | Shares | Position size. Defaults to 1. Must be greater than 0. |

From those four numbers the engine produces:

| Metric | Formula | Reported as |
| --- | --- | --- |
| Capital gain return | `(Vf − V0) / V0` | percent |
| Dividend yield | `D / V0` | percent |
| Total return rate | capital gain + dividend yield | percent |
| Gross price ratio | `Vf / V0` | a multiple, and that multiple × 100 |
| Total dollar return | `(Vf − V0 + D) × N` | dollars |

Percents are the raw ratio × 100, rounded to 4 decimal places. Dollars are rounded to 2. Rates are not annualized, and there is no fee, tax, or split adjustment. One ticket is one holding over one period.

Worked sample (also the **Load sample ticket** button):

- `V0 = 80`, `Vf = 88`, `D = 3.50`, `N = 100`
- Capital gain `(88 − 80) / 80 = 10%`
- Dividend yield `3.50 / 80 = 4.375%`
- Total return `14.375%`
- Gross price ratio `88 / 80 = 1.10×`
- Dollar return `(8 + 3.50) × 100 = $1,150`

## How a request moves

```
Browser ticket
    → POST /api/analyze
    → Flask normalizes types
    → PortfolioService
        → InvestmentInput rejects bad numbers
        → ReturnEngine does the math
        → JSON statement
    → page renders the statement
```

1. `templates/index.html` is the ticket (inputs) and the statement (results). `static/js/app.js` reads the form and `static/css/app.css` draws it.
2. Typing, submitting, or loading the sample sends JSON to `POST /api/analyze`. The page also runs once on load with the values already in the form.
3. `app.py` turns the body into floats and an int. A blank dividend becomes `0`. A blank share count becomes `1`. Missing prices, or values that are not numbers, come back as `400`.
4. `PortfolioService.process_investment_analysis` is the only public entry on the engine. It builds an `InvestmentInput`, which refuses a non-positive start price, a negative end price, a negative dividend, or a non-positive share count.
5. `ReturnEngine.calculate_metrics` applies the formulas above and returns a `ReturnMetricsOutput`. The service rounds that into the JSON the page expects.
6. A good ticket is `{ "status": "SUCCESS", "data": { ... } }` with HTTP 200. A rejected ticket is `{ "status": "ERROR", "message": "..." }` with HTTP 400.

The browser treats anything other than `SUCCESS` as a failed ticket and shows the message in the red ribbon. It does not invent numbers on the client. The waterfall (cost basis, price move, dividends, ending value) is display arithmetic on the same inputs: cost is `V0 × N`, price move is `(Vf − V0) × N`, income is `D × N`. Those rows are not a second model.

## Run it

```bash
pip install -r requirements.txt
python app.py
```

Open [http://127.0.0.1:5050](http://127.0.0.1:5050). The server listens on localhost only.

`python asa.py` skips the web app and prints the sample ticket as JSON. That file is the engine: `InvestmentInput`, `ReturnMetricsOutput`, `ReturnEngine`, and `PortfolioService`. `app.py` only serves the page and the two routes.

## API

`GET /` renders the desk. `GET /api/example` returns the sample ticket. `POST /api/analyze` accepts:

```json
{
  "initial_price": 80.0,
  "final_price": 88.0,
  "dividend": 3.5,
  "shares": 100
}
```

Success:

```json
{
  "status": "SUCCESS",
  "data": {
    "capital_gain_return_pct": 10.0,
    "dividend_yield_pct": 4.375,
    "total_return_rate_pct": 14.375,
    "gross_return_pct": 110.0,
    "total_dollar_return": 1150.0
  }
}
```

`gross_return_pct` is `Vf / V0 × 100`, so `110` means the ending price is 110% of the starting price (1.10×), not an extra 110 points of return. Total return rate is the figure to read for performance.
