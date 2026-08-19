# Legacy Feature Inventory

This inventory records every material interaction, data surface, and visual motif found in the five original competition-demo pages. The originals are preserved unchanged in `legacy/`. `Preserve` means the capability remains recognizable, `Refine` means the implementation or language is corrected, and `Replace` means the legacy mechanism is superseded while its user intent remains.

| Legacy page | Feature | Preserve | Refine | Replace | New location |
|---|---|:---:|:---:|:---:|---|
| `index.html` | SENTIENT / Web3 OS brand header | ✓ |  |  | Global shell |
| `index.html` | Total asset value, USDT and PoD badges | ✓ | ✓ |  | Global telemetry header |
| `index.html` | Exchange entry card | ✓ | ✓ |  | Overview quick entry → `#exchange` |
| `index.html` | NFT Pet Space entry card | ✓ | ✓ |  | Overview quick entry → Behavioral Companion |
| `index.html` | Yield Vault entry card | ✓ | ✓ |  | Overview quick entry → Discipline Vault |
| `index.html` | Defense Settings entry card | ✓ | ✓ |  | Overview quick entry → Policy Studio |
| `index.html` | Dark terminal landing aesthetic | ✓ | ✓ |  | Overview and global shell |
| `index.html` | Unicorn/emoji hero and gaming copy |  | ✓ |  | Pixel companion and responsible behavioral-state copy |
| `exchange.html` | Two-level header and yellow active navigation | ✓ | ✓ |  | Global shell and scrollable SPA navigation |
| `exchange.html` | Header live price | ✓ | ✓ |  | Simulated market ticker, explicitly labelled |
| `exchange.html` | Three-column trading-terminal layout | ✓ | ✓ |  | `#exchange` responsive terminal grid |
| `exchange.html` | Neural companion mini-panel | ✓ | ✓ |  | Exchange behavioral companion panel |
| `exchange.html` | Pixel companion canvas and idle animation | ✓ | ✓ |  | Shared CSS pixel companion renderer |
| `exchange.html` | Pet level and XP | ✓ | ✓ |  | Shared Pet state |
| `exchange.html` | Emotion text |  | ✓ |  | Explainable behavioral-state label |
| `exchange.html` | IRS number, bar, threshold and risk colors | ✓ | ✓ | ✓ | Deterministic ML risk panel |
| `exchange.html` | Manual risk increments and score decay |  |  | ✓ | Exported-model inference and real feature contributions |
| `exchange.html` | System/event log | ✓ | ✓ |  | Shared audit/event stream |
| `exchange.html` | Candlestick chart | ✓ | ✓ |  | Responsive simulated-market chart |
| `exchange.html` | Timeframes: 1m–1mo | ✓ | ✓ |  | Exchange chart controls |
| `exchange.html` | Ranges: 1m/3m/6m/1y/all | ✓ | ✓ |  | Exchange chart controls |
| `exchange.html` | Volume display | ✓ | ✓ |  | Exchange chart volume bars |
| `exchange.html` | Price/trade markers | ✓ | ✓ |  | Exchange chart annotations |
| `exchange.html` | Market buy/sell | ✓ | ✓ |  | Exchange order ticket |
| `exchange.html` | Amount entry and 25/50/75/100% shortcuts | ✓ | ✓ |  | Exchange order ticket |
| `exchange.html` | Wallet-balance and holding validation | ✓ | ✓ |  | Shared transaction validator |
| `exchange.html` | Holdings display | ✓ | ✓ |  | Exchange position summary |
| `exchange.html` | Smart-contract warning modal | ✓ | ✓ |  | Policy-aware intervention modal |
| `exchange.html` | Cancel transaction direction | ✓ | ✓ |  | Abandon action with atomic Vault/Pet updates |
| `exchange.html` | Immediate force-trade direction |  |  | ✓ | Cooldown or explicit permissive-policy confirmation |
| `exchange.html` | Danger glow/shake state | ✓ | ✓ |  | Reduced-motion-aware risk treatment |
| `exchange.html` | Toast notifications | ✓ | ✓ |  | Global toast region |
| `exchange.html` | Page boot loader and scan line | ✓ | ✓ |  | First-session system boot treatment |
| `exchange.html` | Time Travel / backtest drawer | ✓ | ✓ |  | Behavioral Trading Simulation |
| `exchange.html` | Backtest dates and initial capital | ✓ | ✓ |  | Simulation setup |
| `exchange.html` | Backtest manual buy/sell and next day | ✓ | ✓ |  | Simulation controls |
| `exchange.html` | Backtest trade log | ✓ | ✓ |  | Simulation audit log |
| `exchange.html` | Final assets, P/L and ROI | ✓ | ✓ |  | Baseline-versus-policy results |
| `exchange.html` | Pet-state backtest report | ✓ | ✓ |  | Behavioral outcome report |
| `exchange.html` | Backtest history | ✓ | ✓ |  | Session-persisted simulation history |
| `exchange.html` | Random price paths and fallback |  |  | ✓ | Seeded deterministic market fixture |
| `pet.html` | My Pet tab | ✓ | ✓ |  | `#pet` Companion tab |
| `pet.html` | Evolution Path tab | ✓ | ✓ |  | `#pet` Evolution tab |
| `pet.html` | Try-On Room tab and modal | ✓ | ✓ |  | `#pet` Studio tab |
| `pet.html` | Player Showcase tab | ✓ | ✓ |  | `#pet` Gallery tab |
| `pet.html` | Normal, happy and stressed forms | ✓ | ✓ |  | Calm/disciplined, alert/recovering and stressed mappings |
| `pet.html` | Token balance used as both asset and store credit |  |  | ✓ | Separate demo reward credits from market holdings |
| `pet.html` | Boutique purchase flow | ✓ | ✓ |  | Companion boutique with persisted ownership |
| `pet.html` | Glasses, crown, headphones and bandana | ✓ | ✓ |  | Companion boutique and renderer |
| `pet.html` | Scarf try-on without purchase definition | ✓ | ✓ |  | Complete scarf item with documented demo price |
| `pet.html` | Apply Try-On no-op |  | ✓ | ✓ | Functional equipment application |
| `pet.html` | Level, XP, PoD score and intercept count | ✓ | ✓ |  | Shared companion and discipline metrics |
| `pet.html` | Infant/growth/ultimate evolution stages | ✓ | ✓ |  | Transparent demo evolution milestones |
| `pet.html` | Twelve gallery pets | ✓ | ✓ |  | Compact demo showcase grid |
| `pet.html` | NFT/tradable framing |  |  | ✓ | Explicitly non-tradable demo gamification label |
| `vault.html` | Intercepted-trade count and amount | ✓ | ✓ |  | Calculated discipline-surplus summary |
| `vault.html` | FOMO/FUD/overtrade distribution | ✓ | ✓ |  | Risk-driver distribution from intervention events |
| `vault.html` | Recent intercept records | ✓ | ✓ |  | Shared intervention ledger |
| `vault.html` | Protocol ecosystem cards | ✓ | ✓ |  | Illustrative allocation categories and example protocols |
| `vault.html` | Principal, APY and cumulative yield | ✓ | ✓ |  | Calculated simulation with user-configured assumptions |
| `vault.html` | Fixed protocol balances and APYs |  |  | ✓ | State-derived allocation and labelled rates |
| `vault.html` | Actual-versus-impulsive comparison | ✓ | ✓ |  | Event-derived counterfactual comparison |
| `vault.html` | Fixed 128 trades / $89,250 / 18% loss claims |  |  | ✓ | Current-demo calculations or named sample scenario |
| `vault.html` | Defense growth timeline | ✓ | ✓ |  | Intervention-derived timeline |
| `vault.html` | Animated numbers and visual bars | ✓ | ✓ |  | Reduced-motion-aware metric presentation |
| `vault.html` | Cancelled amount deducted and “deposited” to Aave |  |  | ✓ | Capital retained; allocation visualized only, never double-counted |
| `vault.html` | Broken missing protocol element updates |  | ✓ | ✓ | Data-driven allocation cards without missing IDs |
| `vault.html` | Withdraw Yield button without behavior |  |  | ✓ | Removed as misleading; assumption editor replaces it |
| `settings.html` | Defense level shield and active-rule count | ✓ | ✓ |  | Policy Studio summary |
| `settings.html` | IRS threshold slider and description | ✓ | ✓ |  | Persisted threshold control |
| `settings.html` | Mandatory cooldown toggle | ✓ | ✓ |  | Persisted policy control |
| `settings.html` | Cooling-period display | ✓ | ✓ |  | Editable duration plus scaled demo timer |
| `settings.html` | Trading-frequency toggle and meter | ✓ | ✓ |  | Editable transactions-per-hour rule |
| `settings.html` | Amount-tier rules | ✓ | ✓ |  | Non-overlapping editable tiers |
| `settings.html` | “Emotion Pattern Recognition”/neural device roadmap |  |  | ✓ | Responsible-AI limitations and behavioral-proxy explanation |
| `settings.html` | Static controls with no save/reset effects |  | ✓ | ✓ | Functional Save, Reset Demo and preset actions |
| `settings.html` | Conservative/Balanced/Protective presets |  | ✓ |  | New preset cards plus Custom mode |

## New surfaces required by the rebuild

The following are additions rather than migrations: the expanded Overview, Guided Demo, cooldown queue, Why This Score explanations, Risk Analytics, Architecture and trust-boundary view, browser/API model status, chain/contract/attestation status, deterministic model artifacts, signed local attestations, and explicit implementation/simulation/roadmap labels.

## Migration decisions

- The original visual language is preserved; broken fixed-width layouts, misleading claims, no-op controls, stochastic scoring, and fabricated Vault outcomes are corrected.
- A single normalized intervention event updates Exchange history, Vault analytics, Companion XP/state, and the Discipline Index exactly once.
- “Impulse Risk Score (IRS)” is expanded on first use, while “IRS” remains the compact metric label.
- The detailed PoD metric is called **PoD Discipline Index** and is always described as experimental, not a credit score.
