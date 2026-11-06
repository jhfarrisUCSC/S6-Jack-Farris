import {
  buy,
  clickPower,
  costOf,
  createState,
  formatNumber,
  isMaxed,
  levelOf,
  passivePerSecond,
  type UpgradeDef,
  UPGRADES,
  tap,
  tick,
} from "./game.ts";

const app = document.querySelector<HTMLElement>("#app")!;

app.innerHTML = `
  <header class="hero">
    <p class="eyebrow">D1 project</p>
    <h1>Click Counter</h1>
    <p class="tagline">
      Tap to earn. Spend the counter on upgrades that earn for you.
    </p>
  </header>

  <section class="counter-panel" id="counter-panel">
    <p class="count-label">Counter</p>
    <p class="count" id="count">0</p>
    <p class="rate" id="rate">+0 per second</p>
    <button class="mine-button" id="mine" type="button">
      <span>Tap</span>
      <span class="mine-gain" id="mine-gain">+1</span>
    </button>
    <div class="float-layer" id="float-layer" aria-hidden="true"></div>
  </section>

  <section class="shop">
    <h2>Upgrades <span class="shop-note">paid from your counter</span></h2>
    <ul class="upgrade-list" id="upgrade-list"></ul>
  </section>

  <p class="toast" id="toast" role="status" aria-live="polite"></p>
`;

const counterPanel = document.querySelector<HTMLElement>("#counter-panel")!;
const countEl = document.querySelector<HTMLElement>("#count")!;
const rateEl = document.querySelector<HTMLElement>("#rate")!;
const mineButton = document.querySelector<HTMLButtonElement>("#mine")!;
const mineGainEl = document.querySelector<HTMLElement>("#mine-gain")!;
const floatLayer = document.querySelector<HTMLElement>("#float-layer")!;
const listEl = document.querySelector<HTMLUListElement>("#upgrade-list")!;
const toastEl = document.querySelector<HTMLElement>("#toast")!;

interface UpgradeView {
  def: UpgradeDef;
  level: HTMLElement;
  buy: HTMLButtonElement;
}

const state = createState();
const views: UpgradeView[] = [];
let displayedCount = -1;
let toastTimer: number | undefined;

function announce(message: string): void {
  toastEl.textContent = message;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl.textContent = "";
  }, 1600);
}

function createUpgradeView(def: UpgradeDef): UpgradeView {
  const item = document.createElement("li");
  item.className = "upgrade";

  const info = document.createElement("div");
  info.className = "upgrade-info";

  const titleRow = document.createElement("div");
  titleRow.className = "upgrade-title";

  const name = document.createElement("h3");
  name.textContent = def.name;

  const level = document.createElement("span");
  level.className = "upgrade-level";

  const description = document.createElement("p");
  description.className = "upgrade-desc";
  description.textContent = def.description;

  const buyButton = document.createElement("button");
  buyButton.type = "button";
  buyButton.className = "buy-button";
  buyButton.addEventListener("click", () => {
    if (buy(state, def)) {
      announce(`${def.name} upgraded.`);
      render(true);
    }
  });

  titleRow.append(name, level);
  info.append(titleRow, description);
  item.append(info, buyButton);
  listEl.append(item);

  return { def, level, buy: buyButton };
}

for (const def of UPGRADES) {
  views.push(createUpgradeView(def));
}

/** Draws the current state. `force` updates even if the count is unchanged. */
function render(force = false): void {
  const count = Math.floor(state.count);
  if (!force && count === displayedCount) return;
  displayedCount = count;

  countEl.textContent = formatNumber(count);
  rateEl.textContent = `+${formatNumber(passivePerSecond(state))} per second`;
  mineGainEl.textContent = `+${formatNumber(clickPower(state))}`;

  for (const view of views) {
    const level = levelOf(state, view.def.id);
    const maxed = isMaxed(view.def, level);
    const cost = costOf(view.def, level);

    view.level.textContent = view.def.maxLevel === undefined
      ? `Lv ${level}`
      : `Lv ${level}/${view.def.maxLevel}`;
    view.buy.textContent = maxed ? "Maxed" : `Buy ${formatNumber(cost)}`;
    view.buy.disabled = maxed || count < cost;
    view.buy.classList.toggle("affordable", !maxed && count >= cost);
  }
}

function spawnFloat(text: string, x: number, y: number): void {
  const float = document.createElement("span");
  float.className = "float";
  float.textContent = text;
  float.style.left = `${x}px`;
  float.style.top = `${y}px`;
  float.style.setProperty("--drift", `${Math.round(Math.random() * 40 - 20)}px`);
  floatLayer.append(float);
  float.addEventListener("animationend", () => float.remove());
}

mineButton.addEventListener("click", (event) => {
  const gain = tap(state);
  render();

  const rect = counterPanel.getBoundingClientRect();
  const x = event.clientX ? event.clientX - rect.left : rect.width / 2;
  const y = event.clientY ? event.clientY - rect.top : rect.height / 2;
  spawnFloat(`+${formatNumber(gain)}`, x, y);
});

let lastTick = performance.now();
window.setInterval(() => {
  const now = performance.now();
  // Cap the slice so returning to a hidden tab doesn't dump a windfall.
  const seconds = Math.min((now - lastTick) / 1000, 1);
  lastTick = now;
  tick(state, seconds);
  render();
}, 100);

render(true);
