const form = document.getElementById("ticket-form");
const exampleBtn = document.getElementById("example-btn");
const errorRibbon = document.getElementById("error-ribbon");
const resultBody = document.getElementById("result-body");
const engineChip = document.getElementById("engine-chip");
const statementStatus = document.getElementById("statement-status");

const fields = {
  initial_price: document.getElementById("initial_price"),
  final_price: document.getElementById("final_price"),
  dividend: document.getElementById("dividend"),
  shares: document.getElementById("shares"),
};

function readTicket() {
  return {
    initial_price: fields.initial_price.value,
    final_price: fields.final_price.value,
    dividend: fields.dividend.value,
    shares: fields.shares.value,
  };
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function pct(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(4)}%`;
}

function signedMoney(value) {
  const formatted = money(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatted;
}

function showError(message) {
  errorRibbon.hidden = false;
  errorRibbon.textContent = message;
  engineChip.textContent = "ReturnEngine error";
  engineChip.classList.remove("ok");
  engineChip.classList.add("bad");
  statementStatus.textContent = "Validation failed";
  resultBody.classList.add("is-idle");
}

function clearError() {
  errorRibbon.hidden = true;
  errorRibbon.textContent = "";
}

function setWaterfall(ticket, data) {
  const v0 = Number(ticket.initial_price);
  const vf = Number(ticket.final_price);
  const div = Number(ticket.dividend || 0);
  const n = Number(ticket.shares);
  const cost = v0 * n;
  const priceMove = (vf - v0) * n;
  const income = div * n;
  const ending = vf * n;
  const economic = cost + priceMove + income;

  const rows = [
    ["Cost basis", money(cost), ""],
    ["Price move", signedMoney(priceMove), priceMove > 0 ? "up" : priceMove < 0 ? "down" : ""],
    ["Dividends received", signedMoney(income), income > 0 ? "up" : ""],
    ["Ending market value", money(ending), ""],
    ["Economic value (price + income)", money(economic), "total"],
    ["Total dollar return", signedMoney(data.total_dollar_return), "total"],
  ];

  document.getElementById("waterfall-list").innerHTML = rows
    .map(([label, amt, klass]) => {
      const liClass = klass === "total" ? "total" : "";
      const amtClass = ["amt", klass === "up" || klass === "down" ? klass : ""].join(" ").trim();
      return `<li class="${liClass}"><span>${label}</span><span class="${amtClass}">${amt}</span></li>`;
    })
    .join("");
}

function renderSuccess(ticket, data) {
  clearError();
  resultBody.classList.remove("is-idle");
  engineChip.textContent = "ReturnEngine success";
  engineChip.classList.add("ok");
  engineChip.classList.remove("bad");
  statementStatus.textContent = "SUCCESS";

  const total = data.total_return_rate_pct;
  const hero = document.getElementById("hero-return");
  hero.textContent = pct(total);
  hero.classList.toggle("is-up", total > 0);
  hero.classList.toggle("is-down", total < 0);

  const gain = data.capital_gain_return_pct;
  const yieldPct = data.dividend_yield_pct;
  document.getElementById("hero-note").textContent =
    `${pct(gain)} from price · ${pct(yieldPct)} from income`;

  const gainAbs = Math.abs(gain);
  const yieldAbs = Math.abs(yieldPct);
  const mix = gainAbs + yieldAbs;
  const gainShare = mix === 0 ? 50 : (gainAbs / mix) * 100;
  const yieldShare = mix === 0 ? 50 : (yieldAbs / mix) * 100;
  document.getElementById("bar-gain").style.width = `${gainShare}%`;
  document.getElementById("bar-div").style.width = `${yieldShare}%`;
  document.getElementById("compose-split").textContent =
    `${gainShare.toFixed(0)} / ${yieldShare.toFixed(0)}`;

  document.getElementById("m-cagr").textContent = pct(gain);
  document.getElementById("m-div").textContent = pct(yieldPct);
  document.getElementById("m-gross").textContent =
    `${(data.gross_return_pct / 100).toFixed(4)}×  ·  ${data.gross_return_pct.toFixed(4)}%`;
  document.getElementById("m-dollars").textContent = signedMoney(data.total_dollar_return);

  const v0 = Number(ticket.initial_price);
  const vf = Number(ticket.final_price);
  const div = Number(ticket.dividend || 0);
  document.getElementById("formula-line").innerHTML =
    `R = (${fmt(vf)} − ${fmt(v0)}) / ${fmt(v0)} + ${fmt(div)} / ${fmt(v0)} = <strong>${pct(total)}</strong>`;

  drawPricePath(v0, vf);
  setWaterfall(ticket, data);
}

function drawPricePath(v0, vf) {
  const min = Math.min(v0, vf);
  const max = Math.max(v0, vf);
  const span = max - min || 1;
  const y0 = 48 - ((v0 - min) / span) * 28;
  const yf = 48 - ((vf - min) / span) * 28;
  document.getElementById("path-line").setAttribute("d", `M24 ${y0} L256 ${yf}`);
  document.getElementById("path-start").setAttribute("cy", String(y0));
  const end = document.getElementById("path-end");
  end.setAttribute("cy", String(yf));
  end.classList.toggle("is-up", vf > v0);
  end.classList.toggle("is-down", vf < v0);
  document.getElementById("path-start-label").textContent = `V0 ${fmt(v0)}`;
  document.getElementById("path-end-label").textContent = `Vf ${fmt(vf)}`;
}

function fmt(value) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function analyze() {
  const ticket = readTicket();
  engineChip.textContent = "ReturnEngine running";
  engineChip.classList.remove("ok", "bad");

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ticket),
    });
    const payload = await response.json();
    if (payload.status === "SUCCESS") {
      renderSuccess(ticket, payload.data);
      return;
    }
    showError(payload.message || "The engine could not complete this ticket.");
  } catch (error) {
    showError(error.message || "Network error talking to PortfolioService.");
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  analyze();
});

exampleBtn.addEventListener("click", async () => {
  const response = await fetch("/api/example");
  const sample = await response.json();
  fields.initial_price.value = sample.initial_price;
  fields.final_price.value = sample.final_price;
  fields.dividend.value = sample.dividend;
  fields.shares.value = sample.shares;
  analyze();
});

let debounceId = 0;
Object.values(fields).forEach((input) => {
  const queue = () => {
    window.clearTimeout(debounceId);
    debounceId = window.setTimeout(analyze, 220);
  };
  input.addEventListener("input", queue);
  input.addEventListener("change", queue);
});

analyze();
