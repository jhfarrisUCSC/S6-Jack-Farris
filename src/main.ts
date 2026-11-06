import {
  buy,
  costOf,
  createState,
  formatNumber,
  isMaxed,
  launch,
  launchPower,
  levelOf,
  researchPerSecond,
  tick,
  type UpgradeDef,
  UPGRADES,
} from "./game.ts";

const app = document.querySelector<HTMLElement>("#app")!;

app.innerHTML = `
  <header class="hero">
    <p class="eyebrow">Deep Space Research Division</p>
    <h1>Orbital Research</h1>
    <p class="tagline">
      Launch probes, study the solar system, and turn what you learn into
      better equipment.
    </p>
  </header>

  <section class="console" id="console">
    <div class="rocket-bay">
      <button class="rocket-button" id="mine" type="button">
        <span class="rocket-wrap" id="rocket-wrap">
          <span class="rocket-halo" aria-hidden="true"></span>
          <svg class="rocket-svg" viewBox="0 0 120 190" aria-hidden="true">
            <defs>
              <linearGradient id="hull" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#f4fcff" />
                <stop offset="0.55" stop-color="#cfe8ee" />
                <stop offset="1" stop-color="#8fb6c4" />
              </linearGradient>
              <linearGradient id="fin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#ff9a5c" />
                <stop offset="1" stop-color="#c2411f" />
              </linearGradient>
            </defs>
            <path
              d="M60 8c15 17 23 40 23 65v47L60 146 37 120V73C37 48 45 25 60 8Z"
              fill="url(#hull)"
              stroke="#eaf2ff"
              stroke-width="3"
            />
            <path d="M37 92 17 127v25l20-16Z" fill="url(#fin)" />
            <path d="M83 92l20 35v25l-20-16Z" fill="url(#fin)" />
            <circle
              cx="60"
              cy="62"
              r="14"
              fill="#0a2436"
              stroke="#5ce1e6"
              stroke-width="4"
            />
            <path
              d="M50 56c4-5 12-6 17-2"
              stroke="#eaf2ff"
              stroke-width="3"
              stroke-linecap="round"
              fill="none"
              opacity="0.8"
            />
            <path
              d="M52 108h16"
              stroke="#5ce1e6"
              stroke-width="3"
              stroke-linecap="round"
              opacity="0.7"
            />
            <path
              d="M48 143h24l-4 14H52Z"
              fill="#3a5568"
              stroke="#eaf2ff"
              stroke-width="2"
            />
          </svg>
          <span class="flame" aria-hidden="true"></span>
        </span>
        <span class="rocket-cta">
          Launch <span class="gain" id="mine-gain">+1 data</span>
        </span>
      </button>
    </div>

    <div class="readout">
      <p class="readout-label">Research data</p>
      <p class="count" id="count">0</p>
      <p class="rate" id="rate">+0 per second</p>
      <p class="hint">
        Every launch brings data home. Spend it on equipment and research
        targets below.
      </p>
    </div>

    <div class="float-layer" id="float-layer" aria-hidden="true"></div>
  </section>

  <section class="shop">
    <div class="section-head">
      <h2>Equipment Bay</h2>
      <p class="section-note">Improve your launch gear</p>
    </div>
    <div class="upgrade-grid" id="equipment-grid"></div>

    <div class="section-head">
      <h2>Research Targets</h2>
      <p class="section-note">Studied worlds produce data on their own</p>
    </div>
    <div class="upgrade-grid" id="target-grid"></div>
  </section>

  <p class="toast" id="toast" role="status" aria-live="polite"></p>
  <footer class="footer">CMPM 121 · D1 project</footer>
`;

const consoleEl = document.querySelector<HTMLElement>("#console")!;
const countEl = document.querySelector<HTMLElement>("#count")!;
const rateEl = document.querySelector<HTMLElement>("#rate")!;
const mineButton = document.querySelector<HTMLButtonElement>("#mine")!;
const mineGainEl = document.querySelector<HTMLElement>("#mine-gain")!;
const rocketWrap = document.querySelector<HTMLElement>("#rocket-wrap")!;
const floatLayer = document.querySelector<HTMLElement>("#float-layer")!;
const equipmentGrid = document.querySelector<HTMLElement>("#equipment-grid")!;
const targetGrid = document.querySelector<HTMLElement>("#target-grid")!;
const toastEl = document.querySelector<HTMLElement>("#toast")!;

interface UpgradeView {
  def: UpgradeDef;
  tile: HTMLButtonElement;
  level: HTMLElement;
  priceLabel: HTMLElement;
  priceValue: HTMLElement;
}

const EQUIPMENT_ICONS: Record<string, string> = {
  booster: `
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor"
      stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="32" cy="20" r="9" />
      <path d="M32 29v9" />
      <rect x="20" y="38" width="24" height="14" rx="3" />
      <path d="M20 45H8M44 45h12M26 52l-4 8M38 52l4 8" />
    </svg>`,
  thruster: `
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor"
      stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M25 10h14v16l7 12H18l7-12Z" />
      <path d="M27 44v4" />
      <path d="M25 48c-1 6 1 10 7 14 6-4 8-8 7-14" />
      <path d="M32 52v6" />
    </svg>`,
  telescope: `
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor"
      stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 36 36 12l13 15-26 24Z" />
      <path d="m49 27 7-3 3 7-7 3" />
      <path d="M27 47 18 58M35 53l6 9" />
    </svg>`,
};

const state = createState();
const views: UpgradeView[] = [];
let displayedCount = -1;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

function announce(message: string): void {
  toastEl.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.textContent = "";
  }, 1800);
}

function createUpgradeView(def: UpgradeDef): UpgradeView {
  const tile = document.createElement("button");
  tile.type = "button";
  tile.className = "upgrade";
  tile.dataset.kind = def.category;
  tile.dataset.visual = def.id;

  const art = document.createElement("span");
  art.className = def.category === "equipment"
    ? "art art-equipment"
    : "art art-celestial";
  art.dataset.visual = def.id;
  art.setAttribute("aria-hidden", "true");
  if (def.category === "equipment") {
    art.innerHTML = EQUIPMENT_ICONS[def.id] ?? "";
  }

  const nameRow = document.createElement("span");
  nameRow.className = "upgrade-name";

  const name = document.createElement("span");
  name.textContent = def.name;

  const level = document.createElement("span");
  level.className = "level";

  const effect = document.createElement("span");
  effect.className = "upgrade-effect";
  effect.textContent = def.description;

  const foot = document.createElement("span");
  foot.className = "upgrade-foot";

  const priceLabel = document.createElement("span");
  priceLabel.className = "price-label";
  priceLabel.textContent = "Cost";

  const priceValue = document.createElement("span");
  priceValue.className = "price-value";

  nameRow.append(name, level);
  foot.append(priceLabel, priceValue);
  tile.append(art, nameRow, effect, foot);

  tile.addEventListener("click", () => {
    const level = levelOf(state, def.id);
    if (buy(state, def)) {
      announce(
        def.category === "equipment"
          ? `${def.name} installed.`
          : `${def.name} research complete.`,
      );
      render(true);
    } else if (!isMaxed(def, level)) {
      announce(
        `Need ${formatNumber(costOf(def, level))} data for ${def.name}.`,
      );
    }
  });

  const grid = def.category === "equipment" ? equipmentGrid : targetGrid;
  grid.append(tile);

  return { def, tile, level, priceLabel, priceValue };
}

for (const def of UPGRADES) {
  views.push(createUpgradeView(def));
}

/** Draws the current state. `force` updates even if the count is unchanged. */
function render(force = false): void {
  const count = Math.floor(state.count);
  if (!force && count === displayedCount) return;
  displayedCount = count;

  const power = launchPower(state);
  countEl.textContent = formatNumber(count);
  rateEl.textContent = `+${formatNumber(researchPerSecond(state))} per second`;
  mineGainEl.textContent = `+${formatNumber(power)} data`;
  mineButton.setAttribute(
    "aria-label",
    `Launch probe for ${formatNumber(power)} research data`,
  );

  for (const view of views) {
    const level = levelOf(state, view.def.id);
    const maxed = isMaxed(view.def, level);
    const cost = costOf(view.def, level);
    const affordable = !maxed && count >= cost;

    view.level.textContent = view.def.maxLevel === undefined
      ? `Lv ${level}`
      : `Lv ${level}/${view.def.maxLevel}`;
    if (maxed) {
      view.priceLabel.textContent = "Status";
      view.priceValue.textContent = "Maxed";
    } else {
      view.priceLabel.textContent = "Cost";
      view.priceValue.textContent = formatNumber(cost);
    }
    view.tile.classList.toggle("affordable", affordable);
    view.tile.classList.toggle("maxed", maxed);
    view.tile.setAttribute("aria-disabled", String(!affordable));
    view.tile.setAttribute(
      "aria-label",
      maxed
        ? `${view.def.name}, fully upgraded`
        : `${view.def.name}, level ${level}, costs ${cost} data`,
    );
  }
}

function spawnFloat(text: string, x: number, y: number): void {
  const float = document.createElement("span");
  float.className = "float";
  float.textContent = text;
  float.style.left = `${x}px`;
  float.style.top = `${y}px`;
  float.style.setProperty(
    "--drift",
    `${Math.round(Math.random() * 40 - 20)}px`,
  );
  floatLayer.append(float);
  float.addEventListener("animationend", () => float.remove());
}

mineButton.addEventListener("click", (event) => {
  const gain = launch(state);
  render();

  rocketWrap.classList.remove("launching");
  void rocketWrap.offsetWidth;
  rocketWrap.classList.add("launching");

  const consoleRect = consoleEl.getBoundingClientRect();
  const rocketRect = rocketWrap.getBoundingClientRect();
  const x = event.clientX
    ? event.clientX - consoleRect.left
    : rocketRect.left - consoleRect.left + rocketRect.width / 2;
  const y = event.clientY
    ? event.clientY - consoleRect.top
    : rocketRect.top - consoleRect.top + rocketRect.height / 3;
  spawnFloat(`+${formatNumber(gain)}`, x, y);
});

rocketWrap.addEventListener("animationend", () => {
  rocketWrap.classList.remove("launching");
});

let lastTick = performance.now();
setInterval(() => {
  const now = performance.now();
  // Cap the slice so returning to a hidden tab doesn't dump a windfall.
  const seconds = Math.min((now - lastTick) / 1000, 1);
  lastTick = now;
  tick(state, seconds);
  render();
}, 100);

render(true);
