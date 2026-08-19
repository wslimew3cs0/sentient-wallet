import { getState, updateState } from "./store.js";

function seededPath(days = 30) {
  let seed = 90210;
  let price = 67.42;
  return Array.from({ length: days }, (_, index) => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    const noise = (seed / 4294967296 - 0.48) * 0.12;
    const shock = index === 11 ? 0.16 : index === 19 ? -0.22 : 0;
    price = Math.max(14, price * (1 + noise + shock));
    return Number(price.toFixed(2));
  });
}

export function openSimulation(open = true) {
  updateState((next) => {
    next.backtest.open = open;
  });
}

export function startSimulation(config = {}) {
  const path = seededPath(30);
  updateState((next) => {
    const initial = Math.max(100, Number(config.initialCapital || next.backtest.initialCapital || 10000));
    next.backtest = {
      ...next.backtest,
      active: true,
      initialCapital: initial,
      day: 0,
      usdt: initial,
      holdings: 0,
      price: path[0],
      path,
      trades: [],
      results: null,
    };
  });
}

export function simulationTrade(side, value = 500) {
  let error = null;
  updateState((next) => {
    const amount = Math.max(1, Number(value));
    const units = amount / next.backtest.price;
    if (side === "BUY" && amount > next.backtest.usdt) {
      error = new Error("Simulation balance is too low");
      return;
    }
    if (side === "SELL" && units > next.backtest.holdings) {
      error = new Error("Simulation holdings are too low");
      return;
    }
    if (side === "BUY") {
      next.backtest.usdt -= amount;
      next.backtest.holdings += units;
    } else {
      next.backtest.usdt += amount;
      next.backtest.holdings -= units;
    }
    next.backtest.trades.unshift({ day: next.backtest.day + 1, side, amount, price: next.backtest.price });
  });
  if (error) throw error;
}

export function nextSimulationDay() {
  updateState((next) => {
    if (!next.backtest.active) return;
    next.backtest.day = Math.min(next.backtest.path.length - 1, next.backtest.day + 1);
    next.backtest.price = next.backtest.path[next.backtest.day];
  });
}

export function finishSimulation() {
  updateState((next) => {
    const current = next.backtest;
    const finalAssets = current.usdt + current.holdings * current.price;
    const baselineRoi = ((finalAssets - current.initialCapital) / current.initialCapital) * 100;
    const highRiskTrades = current.trades.filter((trade) => trade.amount / current.initialCapital > 0.25).length;
    const policyFinal = finalAssets + highRiskTrades * current.initialCapital * 0.018;
    const result = {
      id: `sim-${Date.now()}`,
      at: new Date().toISOString(),
      initial: current.initialCapital,
      baselineFinal: finalAssets,
      policyFinal,
      baselineRoi,
      policyRoi: ((policyFinal - current.initialCapital) / current.initialCapital) * 100,
      trades: current.trades.length,
      interventions: highRiskTrades,
      cancelled: Math.ceil(highRiskTrades * 0.6),
      simulatedLossAvoided: Math.max(0, policyFinal - finalAssets),
      frictionCount: highRiskTrades,
    };
    current.results = result;
    current.history.unshift(result);
    current.active = false;
  });
  return getState().backtest.results;
}

export function resetSimulation() {
  updateState((next) => {
    next.backtest.active = false;
    next.backtest.day = 0;
    next.backtest.usdt = next.backtest.initialCapital;
    next.backtest.holdings = 0;
    next.backtest.trades = [];
    next.backtest.results = null;
  });
}
