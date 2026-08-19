function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function generateCandles(basePrice = 67.42, scenario = "NORMAL", count = 44) {
  const seed = 1138 + scenario.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const random = seededRandom(seed);
  const candles = [];
  let close = basePrice * 0.91;
  for (let index = 0; index < count; index += 1) {
    const trend = scenario === "FOMO" ? 0.005 : scenario === "VOLATILITY" ? -0.001 : 0.0016;
    const spread = scenario === "VOLATILITY" || scenario === "FOMO" ? 0.045 : 0.018;
    const open = close;
    close = Math.max(8, open * (1 + trend + (random() - 0.47) * spread));
    const high = Math.max(open, close) * (1 + random() * spread * 0.45);
    const low = Math.min(open, close) * (1 - random() * spread * 0.45);
    candles.push({ open, close, high, low, volume: 20 + random() * 75 });
  }
  return candles;
}

export function renderCandlestickChart(state) {
  const candles = generateCandles(state.market.price, state.market.scenario);
  const high = Math.max(...candles.map((item) => item.high));
  const low = Math.min(...candles.map((item) => item.low));
  const scale = (value) => ((high - value) / Math.max(high - low, 1)) * 100;
  const candleMarkup = candles
    .map((item, index) => {
      const rising = item.close >= item.open;
      const top = scale(Math.max(item.open, item.close));
      const bottom = scale(Math.min(item.open, item.close));
      const wickTop = scale(item.high);
      const wickBottom = scale(item.low);
      const volumeHeight = Math.max(8, item.volume * 0.32);
      const marker = index === 31 && state.interventions.length ? '<span class="chart-marker" title="Intervention marker">!</span>' : "";
      return `<div class="candle-column" aria-hidden="true">
        <span class="candle-wick ${rising ? "up" : "down"}" style="top:${wickTop}%;height:${Math.max(1, wickBottom - wickTop)}%"></span>
        <span class="candle-body ${rising ? "up" : "down"}" style="top:${top}%;height:${Math.max(2, bottom - top)}%"></span>
        <span class="volume-bar ${rising ? "up" : "down"}" style="height:${volumeHeight}%"></span>${marker}
      </div>`;
    })
    .join("");
  return `<div class="chart-shell" role="img" aria-label="Deterministic simulated SENT USDT candlestick chart">
    <div class="chart-grid"><span>${high.toFixed(2)}</span><span>${((high + low) / 2).toFixed(2)}</span><span>${low.toFixed(2)}</span></div>
    <div class="candles">${candleMarkup}</div>
    <div class="chart-foot"><span>DETERMINISTIC MARKET FIXTURE</span><span>${state.market.timeframe} · ${state.market.range}</span></div>
  </div>`;
}

export function renderRiskBars(values = []) {
  const max = Math.max(...values, 1);
  return `<div class="mini-bars" aria-label="Recent risk score trend">${values
    .map((value) => `<span style="height:${Math.max(8, (value / max) * 100)}%" title="IRS ${value}"></span>`)
    .join("")}</div>`;
}
