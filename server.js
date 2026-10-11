'use strict';

// Fictional, educational multiplayer stock-market simulation.
// Built only with Node.js built-in modules; no external APIs or dependencies.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const STATE_FILE = path.join(ROOT, 'market-state.json');
const PORT = Number(process.env.PORT || 3000);
const START_CASH = 100_000;
const COMPANY_COUNT = 100;
const DAYS_PER_YEAR = 252;
const TOTAL_YEARS = 30;
const TOTAL_DAYS = DAYS_PER_YEAR * TOTAL_YEARS;
const MAX_BODY_BYTES = 16_384;

const THEMES = [
  { id: 'semiconductor', name: 'Semiconductor & AI', weight: 1.15, tags: ['chip design', 'advanced packaging', 'AI accelerator', 'yield improvement', 'foundry capacity'] },
  { id: 'software', name: 'Software & Cloud', weight: 1.00, tags: ['cloud platform', 'subscription software', 'enterprise security', 'data platform', 'developer tools'] },
  { id: 'ev', name: 'EV & Batteries', weight: 1.00, tags: ['battery chemistry', 'charging network', 'electric drivetrain', 'battery recycling', 'vehicle software'] },
  { id: 'biotech', name: 'Biotech & Healthcare', weight: 1.10, tags: ['clinical research', 'diagnostic platform', 'drug discovery', 'medical devices', 'clinical trial operations'] },
  { id: 'energy', name: 'Energy & Power', weight: 0.95, tags: ['grid storage', 'power equipment', 'renewable generation', 'grid modernization', 'energy management'] },
  { id: 'robotics', name: 'Robotics & Automation', weight: 1.05, tags: ['industrial robotics', 'machine vision', 'factory automation', 'precision motion', 'warehouse systems'] },
  { id: 'finance', name: 'Financial Services', weight: 0.90, tags: ['payment systems', 'fraud detection', 'credit analytics', 'digital banking', 'risk management'] },
  { id: 'consumer', name: 'Consumer & Retail', weight: 0.85, tags: ['direct-to-consumer', 'inventory analytics', 'brand expansion', 'retail logistics', 'customer loyalty'] },
  { id: 'aerospace', name: 'Industrial & Aerospace', weight: 1.00, tags: ['flight systems', 'advanced materials', 'industrial components', 'defense electronics', 'maintenance services'] },
  { id: 'telecom', name: 'Telecom & Infrastructure', weight: 0.90, tags: ['fiber networks', 'data centers', 'network equipment', 'edge computing', 'infrastructure software'] }
];

const NEWS_B = [
  { theme: 'ALL', text: '{company} increases its internal research budget for {tag}.', clue: 'More resources may improve future products, but spending alone does not guarantee success.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} posts several specialist roles related to {tag}.', clue: 'Hiring can be an early signal of expansion; it can also reflect staff turnover.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} begins recruiting a senior technical leader.', clue: 'Leadership changes may affect execution over the coming quarters.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} forms a small internal team to assess {tag}.', clue: 'An exploratory team is not the same as a successful project.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} adjusts the timeline for a next-generation product.', clue: 'A changed timeline can signal either caution or a more ambitious scope.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} is reviewing equipment options for {tag}.', clue: 'Supplier reviews can precede investment, but may not lead to an order.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} begins a new supplier quality assessment.', clue: 'Quality work can reduce future defects; it may also reveal existing problems.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} studies a possible long-term supply agreement.', clue: 'A study is preliminary and does not mean a contract has been signed.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} expands pilot testing with a small group of customers.', clue: 'Pilot feedback can foreshadow adoption, but pilots often fail to scale.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} starts validating a product for a potential large customer.', clue: 'Validation is an important hurdle, not a confirmed sale.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} reviews the feasibility of a new production line.', clue: 'A feasibility review may precede capex or end with no investment.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} allocates engineering time to improve production yield.', clue: 'Better yield could lower unit costs if the work succeeds.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} evaluates a second source for a key component.', clue: 'A second source may reduce supply risk, but qualification takes time.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} increases internal testing of a new prototype.', clue: 'More testing can mean progress or that unresolved issues remain.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} begins preparations for a regulatory or standards review.', clue: 'Preparation is not approval; the outcome remains uncertain.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} reviews customer demand in a new region.', clue: 'Market research may lead to expansion or a decision not to enter.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} considers adding distribution partners.', clue: 'Distribution can widen reach, but partners may demand lower margins.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} starts a cost-efficiency project across several teams.', clue: 'Savings may improve margins, although implementation can be disruptive.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} reviews working-capital needs for the next product cycle.', clue: 'This may anticipate growth or point to cash-flow pressure.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} reassigns staff to a strategic project involving {tag}.', clue: 'Resource shifts suggest priorities, not necessarily project quality.', effect: 'neutral' },
  { theme: 'semiconductor', text: '{company} increases experiments on advanced packaging and chip yield.', clue: 'Packaging and yield improvements can matter greatly, but results are uncertain.', effect: 'neutral' },
  { theme: 'semiconductor', text: '{company} is quietly recruiting engineers with accelerator-design experience.', clue: 'Specialist hiring may be an early clue to a future product cycle.', effect: 'neutral' },
  { theme: 'semiconductor', text: '{company} requests quotes for additional wafer-testing equipment.', clue: 'Quotes are not purchase orders; demand expectations may be changing.', effect: 'neutral' },
  { theme: 'software', text: '{company} tests a new enterprise pricing model with selected clients.', clue: 'Pricing tests can lift revenue per client or increase churn.', effect: 'neutral' },
  { theme: 'software', text: '{company} is assessing whether to expand its security engineering group.', clue: 'Security investment may support retention, but adds cost first.', effect: 'neutral' },
  { theme: 'ev', text: '{company} begins a battery durability study with an external lab.', clue: 'Durability is important, but study results are not yet known.', effect: 'neutral' },
  { theme: 'ev', text: '{company} reviews long-term sourcing options for battery materials.', clue: 'Supply planning may reduce risk or expose higher future costs.', effect: 'neutral' },
  { theme: 'biotech', text: '{company} adds clinical operations staff for an ongoing program.', clue: 'More staff may indicate preparation for a larger trial; success is not assured.', effect: 'neutral' },
  { theme: 'biotech', text: '{company} schedules additional analysis of early trial data.', clue: 'Additional analysis can clarify results but may reveal weak efficacy.', effect: 'neutral' },
  { theme: 'energy', text: '{company} studies a grid-storage demonstration project.', clue: 'A demonstration can unlock future contracts, but economics must work.', effect: 'neutral' },
  { theme: 'energy', text: '{company} reviews component lead times for power equipment.', clue: 'Long lead times may indicate demand strength or supply constraints.', effect: 'neutral' },
  { theme: 'robotics', text: '{company} runs extended reliability tests on a new automation unit.', clue: 'Reliability improvements can aid adoption; failed tests can delay launch.', effect: 'neutral' },
  { theme: 'robotics', text: '{company} recruits machine-vision engineers for a new project.', clue: 'Hiring hints at product direction, not the eventual commercial result.', effect: 'neutral' },
  { theme: 'finance', text: '{company} pilots a revised fraud-detection model.', clue: 'Better detection may reduce losses, but false positives can hurt customers.', effect: 'neutral' },
  { theme: 'finance', text: '{company} reviews lending criteria after a change in customer behavior.', clue: 'Tighter criteria can lower risk but also reduce loan growth.', effect: 'neutral' },
  { theme: 'consumer', text: '{company} tests a new loyalty program in a limited region.', clue: 'Retention may improve, though rewards can reduce margins.', effect: 'neutral' },
  { theme: 'consumer', text: '{company} adjusts inventory targets ahead of a seasonal period.', clue: 'Lower inventory can improve cash flow or cause stockouts.', effect: 'neutral' },
  { theme: 'aerospace', text: '{company} reviews certification documentation for a component.', clue: 'Certification progress can precede sales, but review can take longer than expected.', effect: 'neutral' },
  { theme: 'aerospace', text: '{company} evaluates an alternative material for a critical part.', clue: 'A lighter or cheaper material may help if reliability requirements are met.', effect: 'neutral' },
  { theme: 'telecom', text: '{company} tests network equipment under higher traffic loads.', clue: 'Successful tests can support future deployments; failures may delay them.', effect: 'neutral' },
  { theme: 'telecom', text: '{company} reviews capacity plans for a data-center region.', clue: 'Capacity planning may reflect demand expectations, but capex is costly.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} delays a non-core project while reviewing priorities.', clue: 'This may improve focus or signal budget pressure.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} asks a small group of customers to test a revised product.', clue: 'Customer feedback may be promising or disappointing.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} reviews a possible partnership with an industry supplier.', clue: 'Talks may create options but can end without an agreement.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} updates its internal forecast for component availability.', clue: 'Availability changes can affect delivery timing and costs.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} is reorganizing teams around a long-term product roadmap.', clue: 'A clearer roadmap may help execution, but reorganization has risks.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} studies whether a current product can serve a new customer segment.', clue: 'A new segment can expand demand, but the fit is unproven.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} increases internal audits of production and service quality.', clue: 'Quality focus may prevent future problems or uncover existing ones.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} is reviewing the staffing plan for next year.', clue: 'A hiring plan is an intention, not proof of future growth.', effect: 'neutral' },
  { theme: 'ALL', text: '{company} requests a revised proposal from a potential equipment vendor.', clue: 'Vendor negotiations may precede investment or be abandoned.', effect: 'neutral' }
];

const NEWS_A = [
  { theme: 'ALL', text: '{company} shares jump sharply over the past month.', move: 0.025, tone: 'positive', category: 'price' },
  { theme: 'ALL', text: '{company} shares fall sharply after a volatile week.', move: -0.035, tone: 'negative', category: 'price' },
  { theme: 'ALL', text: 'Trading volume in {ticker} rises well above its recent average.', move: 0.008, tone: 'mixed', category: 'price' },
  { theme: 'ALL', text: '{ticker} breaks above its recent trading range.', move: 0.018, tone: 'positive', category: 'price' },
  { theme: 'ALL', text: '{ticker} falls below a price level watched by traders.', move: -0.018, tone: 'negative', category: 'price' },
  { theme: 'ALL', text: 'Analysts debate whether {ticker} has run too far, too fast.', move: -0.004, tone: 'mixed', category: 'price' },
  { theme: 'ALL', text: '{company} reports quarterly revenue above expectations.', move: 0.035, tone: 'positive', category: 'earnings' },
  { theme: 'ALL', text: '{company} reports quarterly revenue below expectations.', move: -0.04, tone: 'negative', category: 'earnings' },
  { theme: 'ALL', text: '{company} reports stronger-than-expected operating profit.', move: 0.04, tone: 'positive', category: 'earnings' },
  { theme: 'ALL', text: '{company} reports weaker operating margins.', move: -0.035, tone: 'negative', category: 'earnings' },
  { theme: 'ALL', text: '{company} raises its forward outlook.', move: 0.045, tone: 'positive', category: 'guidance' },
  { theme: 'ALL', text: '{company} lowers its forward outlook.', move: -0.05, tone: 'negative', category: 'guidance' },
  { theme: 'ALL', text: '{company} announces a new product launch.', move: 0.022, tone: 'positive', category: 'product' },
  { theme: 'ALL', text: '{company} publicly demonstrates a technology milestone.', move: 0.025, tone: 'positive', category: 'product' },
  { theme: 'ALL', text: '{company} announces a major customer contract.', move: 0.05, tone: 'positive', category: 'contract' },
  { theme: 'ALL', text: '{company} loses a significant customer contract.', move: -0.055, tone: 'negative', category: 'contract' },
  { theme: 'ALL', text: '{company} confirms a large new order.', move: 0.035, tone: 'positive', category: 'contract' },
  { theme: 'ALL', text: '{company} postpones a planned facility expansion.', move: -0.022, tone: 'negative', category: 'operations' },
  { theme: 'ALL', text: '{company} begins construction on a new facility.', move: 0.018, tone: 'positive', category: 'operations' },
  { theme: 'ALL', text: '{company} announces an acquisition.', move: 0.012, tone: 'mixed', category: 'corporate' },
  { theme: 'ALL', text: '{company} ends merger discussions without a deal.', move: -0.018, tone: 'negative', category: 'corporate' },
  { theme: 'ALL', text: '{company} increases its dividend.', move: 0.018, tone: 'positive', category: 'capital' },
  { theme: 'ALL', text: '{company} cuts its dividend to preserve cash.', move: -0.04, tone: 'negative', category: 'capital' },
  { theme: 'ALL', text: '{company} announces a share repurchase program.', move: 0.02, tone: 'positive', category: 'capital' },
  { theme: 'ALL', text: '{company} announces a new share issuance.', move: -0.025, tone: 'negative', category: 'capital' },
  { theme: 'ALL', text: '{company} replaces its chief executive.', move: -0.008, tone: 'mixed', category: 'management' },
  { theme: 'ALL', text: '{company} announces the departure of a senior executive.', move: -0.02, tone: 'negative', category: 'management' },
  { theme: 'ALL', text: '{company} launches a restructuring program.', move: -0.012, tone: 'mixed', category: 'management' },
  { theme: 'ALL', text: '{company} reports a product-quality issue.', move: -0.04, tone: 'negative', category: 'risk' },
  { theme: 'ALL', text: '{company} recalls a product batch for additional checks.', move: -0.05, tone: 'negative', category: 'risk' },
  { theme: 'ALL', text: 'Regulators open an inquiry involving {company}.', move: -0.04, tone: 'negative', category: 'risk' },
  { theme: 'ALL', text: '{company} receives a key regulatory approval.', move: 0.05, tone: 'positive', category: 'regulatory' },
  { theme: 'ALL', text: '{company} receives an unfavorable legal ruling.', move: -0.035, tone: 'negative', category: 'legal' },
  { theme: 'ALL', text: 'Industry demand forecasts are raised for {themeName}.', move: 0.018, tone: 'positive', category: 'theme' },
  { theme: 'ALL', text: 'Industry demand forecasts are cut for {themeName}.', move: -0.022, tone: 'negative', category: 'theme' },
  { theme: 'ALL', text: 'Input costs rise across the {themeName} sector.', move: -0.015, tone: 'negative', category: 'theme' },
  { theme: 'ALL', text: 'A competitor announces a product that could pressure {company}.', move: -0.02, tone: 'negative', category: 'competition' },
  { theme: 'ALL', text: '{company} announces an international expansion.', move: 0.022, tone: 'positive', category: 'strategy' },
  { theme: 'ALL', text: '{company} abandons a costly non-core initiative.', move: 0.012, tone: 'mixed', category: 'strategy' },
  { theme: 'ALL', text: 'Credit analysts revise their view of {company}.', move: -0.012, tone: 'mixed', category: 'credit' },
  { theme: 'ALL', text: '{company} announces a strategic partnership.', move: 0.025, tone: 'positive', category: 'corporate' },
  { theme: 'ALL', text: '{company} misses a major product delivery deadline.', move: -0.03, tone: 'negative', category: 'operations' },
  { theme: 'ALL', text: '{company} announces better-than-expected customer retention.', move: 0.025, tone: 'positive', category: 'operations' },
  { theme: 'ALL', text: '{company} reports a rise in customer cancellations.', move: -0.03, tone: 'negative', category: 'operations' },
  { theme: 'ALL', text: '{company} announces an unexpected cash-flow shortfall.', move: -0.045, tone: 'negative', category: 'finance' },
  { theme: 'ALL', text: '{company} reports a stronger cash position than expected.', move: 0.02, tone: 'positive', category: 'finance' },
  { theme: 'ALL', text: 'A broad market risk-off move weighs on {company}.', move: -0.02, tone: 'negative', category: 'macro' },
  { theme: 'ALL', text: 'Investor appetite improves across the {themeName} sector.', move: 0.015, tone: 'positive', category: 'theme' },
  { theme: 'ALL', text: 'Investor appetite weakens across the {themeName} sector.', move: -0.018, tone: 'negative', category: 'theme' },
  { theme: 'ALL', text: '{company} announces a material write-down.', move: -0.045, tone: 'negative', category: 'finance' }
];

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function rand(min, max) { return min + Math.random() * (max - min); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function tickerFor(n) {
  let s = '';
  n += 1;
  while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
  return s;
}
function isoDate(dayIndex) {
  const d = new Date(Date.UTC(2000, 0, 3 + dayIndex));
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
function safeName(s) { return String(s || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 24); }

function createCompany(i) {
  const theme = THEMES[i % THEMES.length];
  const nameSeeds = ['Aster', 'Bluepeak', 'Cinder', 'Dovetail', 'Everline', 'Foxbridge', 'Glimmer', 'Harbor', 'Ionworks', 'Juniper', 'Keystone', 'Lattice', 'Mosaic', 'Northstar', 'Orbit', 'Pioneer', 'Quartz', 'Redwood', 'Silverpath', 'Tandem'];
  const suffixes = ['Systems', 'Technologies', 'Labs', 'Industries', 'Networks', 'Group', 'Dynamics', 'Works', 'Holdings', 'Solutions'];
  const ticker = tickerFor(i);
  const quality = rand(0.25, 0.85);
  const initialPrice = Math.round(rand(12, 180) * 100) / 100;
  return {
    ticker,
    name: `${nameSeeds[i % nameSeeds.length]} ${suffixes[Math.floor(i / nameSeeds.length) % suffixes.length]}`,
    themeId: theme.id,
    themeName: theme.name,
    tag: pick(theme.tags),
    price: initialPrice,
    initialPrice,
    previousClose: 0,
    history: [],
    quality,
    cashHealth: rand(0.35, 0.95),
    growth: rand(-0.015, 0.035),
    volatility: rand(0.012, 0.035),
    researchProgress: rand(0.1, 0.55),
    projectStage: 0,
    projectSuccessChance: rand(0.2, 0.7),
    nextMilestoneDay: Math.floor(rand(60, 420)),
    delisted: false,
    listedDay: 0,
    lastNewsDay: -999,
    totalReturn: 0
  };
}

function createInitialState() {
  const companies = Array.from({ length: COMPANY_COUNT }, (_, i) => createCompany(i));
  companies.forEach(c => { c.previousClose = c.price; c.history = [c.price]; });
  return {
    version: 1,
    day: 0,
    year: 1,
    startTimestamp: Date.now(),
    companies,
    players: {},
    bots: Array.from({ length: 12 }, (_, i) => ({ id: `bot-${i + 1}`, name: `Market Bot ${String(i + 1).padStart(2, '0')}`, cash: START_CASH, holdings: {}, fomo: 0, initialValue: START_CASH, trades: 0 })),
    news: [{ id: crypto.randomUUID(), day: 0, ticker: null, kind: 'system', tone: 'neutral', title: 'Market opens', text: 'The fictional market is open. Prices, companies, and events are generated by this local simulation.', clue: 'Early-stage companies may offer growth, but uncertainty is high.' }],
    themeSentiment: Object.fromEntries(THEMES.map(t => [t.id, 0])),
    themeMomentum: Object.fromEntries(THEMES.map(t => [t.id, 0])),
    eventLog: [],
    status: 'running'
  };
}

function loadState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return createInitialState();
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.companies) || !parsed.players) throw new Error('Invalid state structure');
    return parsed;
  } catch (err) {
    console.error('State file could not be loaded; starting a fresh market:', err.message);
    const backup = STATE_FILE + '.corrupt-' + Date.now();
    try { if (fs.existsSync(STATE_FILE)) fs.copyFileSync(STATE_FILE, backup); } catch (_) {}
    return createInitialState();
  }
}
let state = loadState();
let saveTimer = null;
function saveState() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = STATE_FILE + '.tmp';
    try {
      fs.writeFileSync(tmp, JSON.stringify(state), 'utf8');
      fs.renameSync(tmp, STATE_FILE);
    } catch (err) { console.error('Could not save state:', err.message); }
  }, 40);
}

function companyByTicker(ticker) { return state.companies.find(c => c.ticker === ticker); }
function getPlayer(id) { return state.players[id] || null; }
function portfolioValue(account) {
  return account.cash + Object.entries(account.holdings).reduce((sum, [ticker, qty]) => {
    const c = companyByTicker(ticker);
    return sum + (c && !c.delisted ? c.price * qty : 0);
  }, 0);
}
function averageCompanyReturn() {
  const active = state.companies.filter(c => !c.delisted && c.history.length > 0);
  if (!active.length) return 0;
  return active.reduce((sum, c) => sum + (c.price / (c.initialPrice || c.history[0] || c.price) - 1), 0) / active.length;
}
function updateFomo(account) {
  const pReturn = portfolioValue(account) / (account.initialValue || START_CASH) - 1;
  const gap = averageCompanyReturn() - pReturn;
  // Slow cumulative-return comparison: avoids filling the meter from ordinary daily noise.
  if (gap > 0.02) account.fomo = clamp(account.fomo + Math.min(1.2, (gap - 0.02) * 1.5), 0, 100);
  else if (gap < -0.02) account.fomo = clamp(account.fomo - Math.min(1.0, (-gap - 0.02) * 1.2), 0, 100);
  return account.fomo;
}
function formatTemplate(text, company) {
  const theme = THEMES.find(t => t.id === company.themeId) || THEMES[0];
  return text.replaceAll('{company}', company.name).replaceAll('{ticker}', company.ticker).replaceAll('{tag}', company.tag).replaceAll('{themeName}', theme.name);
}
function addNews(item) {
  item.id = crypto.randomUUID();
  item.day = state.day;
  state.news.unshift(item);
  if (state.news.length > 160) state.news.length = 160;
}

function themeShock(themeId, shock, sourceTicker, label) {
  state.themeSentiment[themeId] = clamp((state.themeSentiment[themeId] || 0) + shock, -0.12, 0.12);
  state.themeMomentum[themeId] = clamp((state.themeMomentum[themeId] || 0) + shock * 0.45, -0.08, 0.08);
  // Competitors may benefit from sector optimism, but direct rivals can be hurt by firm-specific breakthroughs.
  for (const c of state.companies) {
    if (c.delisted || c.themeId !== themeId || c.ticker === sourceTicker) continue;
    c.price = Math.max(0.5, c.price * (1 + shock * rand(0.08, 0.38)));
  }
  if (label) state.eventLog.unshift({ day: state.day, label, themeId, shock });
}

function emitClueNews(company) {
  const eligible = NEWS_B.filter(n => n.theme === 'ALL' || n.theme === company.themeId);
  const template = pick(eligible);
  addNews({ ticker: company.ticker, kind: 'clue', tone: 'neutral', title: `Research note · ${company.ticker}`, text: formatTemplate(template.text, company), clue: template.clue, themeId: company.themeId });
  company.lastNewsDay = state.day;
  // Clue news changes hidden fundamentals probabilistically, not the price directly.
  const r = Math.random();
  if (r < 0.18) company.researchProgress = clamp(company.researchProgress + rand(0.04, 0.12), 0, 1);
  else if (r < 0.27) company.projectSuccessChance = clamp(company.projectSuccessChance + rand(0.02, 0.08), 0.05, 0.9);
  else if (r < 0.37) company.cashHealth = clamp(company.cashHealth - rand(0.01, 0.06), 0.05, 1);
  else if (r < 0.47) company.projectSuccessChance = clamp(company.projectSuccessChance - rand(0.03, 0.1), 0.05, 0.9);
}

function emitPublicNews(company) {
  const template = pick(NEWS_A);
  const directMove = template.move * rand(0.7, 1.25);
  company.price = Math.max(0.5, company.price * (1 + directMove));
  let themeMove = 0;
  if (template.category === 'theme') themeMove = directMove * 1.1;
  else if (template.tone === 'positive') themeMove = directMove * 0.12;
  else if (template.tone === 'negative') themeMove = directMove * 0.10;
  if (themeMove) themeShock(company.themeId, themeMove, company.ticker, `${company.themeName}: ${template.tone} news`);
  addNews({ ticker: company.ticker, kind: 'public', tone: template.tone, title: `Market news · ${company.ticker}`, text: formatTemplate(template.text, company), clue: 'Public information may already be partly reflected in the price. Compare it with expectations and company fundamentals.', themeId: company.themeId });
  company.lastNewsDay = state.day;
}

function updateCompany(c) {
  if (c.delisted) return;
  c.previousClose = c.price;
  const sentiment = state.themeSentiment[c.themeId] || 0;
  const momentum = state.themeMomentum[c.themeId] || 0;
  const qualityDrift = (c.quality - 0.5) * 0.00018;
  const progressDrift = (c.researchProgress - 0.4) * 0.00025;
  const randomShock = rand(-c.volatility, c.volatility);
  const dailyDrift = c.growth / DAYS_PER_YEAR + qualityDrift + progressDrift + sentiment * 0.018 + momentum * 0.008;
  const dailyMove = clamp(dailyDrift + randomShock, -0.18, 0.18);
  c.price = Math.max(0.5, Math.round(c.price * (1 + dailyMove) * 100) / 100);
  c.history.push(c.price);
  if (c.history.length > 220) c.history.shift();
  c.researchProgress = clamp(c.researchProgress + rand(-0.002, 0.006), 0, 1);
  c.cashHealth = clamp(c.cashHealth + rand(-0.002, 0.0015) + (c.quality - 0.5) * 0.0003, 0, 1);

  if (state.day >= c.nextMilestoneDay) {
    if (Math.random() < c.projectSuccessChance * (0.4 + c.researchProgress * 0.7)) {
      c.projectStage++;
      c.quality = clamp(c.quality + rand(0.02, 0.08), 0, 1);
      c.growth = clamp(c.growth + rand(0.002, 0.012), -0.04, 0.08);
      c.price = Math.max(0.5, c.price * (1 + rand(0.03, 0.11)));
      addNews({ ticker: c.ticker, kind: 'reveal', tone: 'positive', title: `Milestone reached · ${c.ticker}`, text: `${c.name} completes a meaningful internal milestone in ${c.tag}.`, clue: 'A previously uncertain project has made progress. Future commercial success is still not guaranteed.', themeId: c.themeId });
      themeShock(c.themeId, rand(0.002, 0.009), c.ticker, null);
    } else if (Math.random() < 0.34) {
      c.quality = clamp(c.quality - rand(0.02, 0.08), 0, 1);
      c.growth = clamp(c.growth - rand(0.002, 0.012), -0.04, 0.08);
      c.price = Math.max(0.5, c.price * (1 - rand(0.04, 0.14)));
      addNews({ ticker: c.ticker, kind: 'reveal', tone: 'negative', title: `Project setback · ${c.ticker}`, text: `${c.name} encounters a setback in ${c.tag}.`, clue: 'The earlier clues were not guarantees; execution risk has materialized.', themeId: c.themeId });
      themeShock(c.themeId, -rand(0.001, 0.006), c.ticker, null);
    }
    c.nextMilestoneDay += Math.floor(rand(90, 360));
  }

  // Delisting / insolvency is possible, not automatic; very low cash health raises risk.
  const distress = c.cashHealth < 0.12 && c.price < 3;
  if (distress && Math.random() < 0.012) {
    c.delisted = true;
    c.price = 0;
    addNews({ ticker: c.ticker, kind: 'delisting', tone: 'negative', title: `Trading suspended · ${c.ticker}`, text: `${c.name} enters a fictional insolvency process and is delisted.`, clue: 'Delisted shares are treated as having no recoverable value in this simplified simulation.', themeId: c.themeId });
  }
}

function botTrade(bot) {
  const active = state.companies.filter(c => !c.delisted);
  if (!active.length) return;
  const target = pick(active);
  const quantity = Math.max(1, Math.floor(rand(1, 12)));
  const value = target.price * quantity;
  const held = bot.holdings[target.ticker] || 0;
  if (Math.random() < 0.55 && bot.cash > value * 1.002) {
    const cost = value * 1.001;
    bot.cash -= cost;
    bot.holdings[target.ticker] = held + quantity;
    bot.trades++;
  } else if (held > 0) {
    const sellQty = Math.min(held, quantity);
    bot.cash += target.price * sellQty * 0.999;
    bot.holdings[target.ticker] = held - sellQty;
    if (!bot.holdings[target.ticker]) delete bot.holdings[target.ticker];
    bot.trades++;
  }
}

function advanceOneDay() {
  if (state.day >= TOTAL_DAYS) { state.status = 'finished'; return; }
  state.day++;
  state.year = Math.min(TOTAL_YEARS, Math.floor((state.day - 1) / DAYS_PER_YEAR) + 1);
  // Fade sector shocks gradually, keeping effects persistent but not permanent.
  for (const t of THEMES) {
    state.themeSentiment[t.id] *= 0.965;
    state.themeMomentum[t.id] *= 0.93;
  }
  for (const c of state.companies) updateCompany(c);

  // A few news items per simulated day. Company/theme relevance is enforced.
  const active = state.companies.filter(c => !c.delisted);
  const newsCount = Math.random() < 0.22 ? 3 : (Math.random() < 0.65 ? 1 : 2);
  for (let i = 0; i < newsCount; i++) {
    const c = pick(active);
    if (Math.random() < 0.52) emitClueNews(c); else emitPublicNews(c);
  }

  for (const bot of state.bots) {
    if (Math.random() < 0.72) botTrade(bot);
    updateFomo(bot);
  }
  for (const p of Object.values(state.players)) updateFomo(p);
  if (state.day >= TOTAL_DAYS) state.status = 'finished';
  saveState();
}

function trade(player, ticker, side, quantity) {
  const c = companyByTicker(ticker);
  if (!c || c.delisted) throw new Error('해당 주식은 거래할 수 없습니다.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) throw new Error('수량은 1~100,000주 정수여야 합니다.');
  const holding = player.holdings[ticker] || 0;
  if (side === 'buy') {
    if (player.fomo >= 100) {
      const history = c.history;
      const old = history[Math.max(0, history.length - 6)] || c.price;
      const fiveDayReturn = c.price / old - 1;
      if (fiveDayReturn < 0.08) throw new Error('FOMO가 100입니다. 최근 5거래일에 8% 이상 상승한 주식만 매수할 수 있습니다.');
    }
    const gross = c.price * quantity;
    const fee = gross * 0.001;
    const total = gross + fee;
    if (player.cash + 1e-8 < total) throw new Error('현금이 부족합니다.');
    player.cash -= total;
    player.holdings[ticker] = holding + quantity;
  } else if (side === 'sell') {
    if (holding < quantity) throw new Error('보유 수량이 부족합니다.');
    const gross = c.price * quantity;
    const fee = gross * 0.001;
    player.cash += gross - fee;
    player.holdings[ticker] = holding - quantity;
    if (player.holdings[ticker] === 0) delete player.holdings[ticker];
  } else throw new Error('거래 방향이 올바르지 않습니다.');
  player.trades++;
  player.lastActionAt = Date.now();
  saveState();
  return { ok: true, message: `${ticker} ${quantity}주 ${side === 'buy' ? '매수' : '매도'} 완료` };
}

function publicState(playerId) {
  const me = getPlayer(playerId);
  const companies = state.companies.map(c => ({
    ticker: c.ticker, name: c.name, themeId: c.themeId, themeName: c.themeName,
    price: c.price, previousClose: c.previousClose,
    changePct: c.previousClose ? (c.price / c.previousClose - 1) * 100 : 0,
    history: c.history.slice(-60), delisted: c.delisted,
    qualityLabel: c.quality > 0.72 ? 'Strong' : c.quality > 0.48 ? 'Average' : 'Weak'
  }));
  const leaderboard = [
    ...Object.values(state.players).map(p => ({ id: p.id, name: p.name, value: portfolioValue(p), returnPct: portfolioValue(p) / p.initialValue - 1, isBot: false })),
    ...state.bots.map(b => ({ id: b.id, name: b.name, value: portfolioValue(b), returnPct: portfolioValue(b) / b.initialValue - 1, isBot: true }))
  ].sort((a, b) => b.value - a.value).slice(0, 25);
  const avgReturn = averageCompanyReturn();
  return {
    market: { day: state.day, totalDays: TOTAL_DAYS, year: state.year, totalYears: TOTAL_YEARS, date: isoDate(state.day), status: state.status, activeCompanies: state.companies.filter(c => !c.delisted).length, averageCompanyReturn: avgReturn, themes: THEMES.map(t => ({ ...t, sentiment: state.themeSentiment[t.id] || 0 })) },
    companies,
    news: state.news.slice(0, 80),
    leaderboard,
    player: me ? { id: me.id, name: me.name, cash: me.cash, holdings: me.holdings, value: portfolioValue(me), initialValue: me.initialValue, returnPct: portfolioValue(me) / me.initialValue - 1, fomo: me.fomo, trades: me.trades, joinedAt: me.joinedAt } : null
  };
}

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body), 'X-Content-Type-Options': 'nosniff' });
  res.end(body);
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (Buffer.byteLength(raw) > MAX_BODY_BYTES) { reject(new Error('요청이 너무 큽니다.')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch (_) { reject(new Error('JSON 요청 형식이 올바르지 않습니다.')); }
    });
    req.on('error', reject);
  });
}
function serveStatic(req, res) {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const requested = pathname === '/' ? '/index.html' : pathname;
  const fullPath = path.resolve(PUBLIC, '.' + requested);
  if (!fullPath.startsWith(PUBLIC + path.sep) && fullPath !== path.join(PUBLIC, 'index.html')) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(fullPath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(fullPath);
    const type = ext === '.html' ? 'text/html; charset=utf-8' : ext === '.css' ? 'text/css; charset=utf-8' : ext === '.js' ? 'text/javascript; charset=utf-8' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) {
    try {
      if (req.method === 'GET' && req.url.startsWith('/api/state')) {
        const url = new URL(req.url, 'http://localhost');
        return send(res, 200, publicState(url.searchParams.get('playerId')));
      }
      if (req.method === 'POST' && req.url === '/api/join') {
        const body = await readJson(req);
        const name = safeName(body.name);
        if (name.length < 1) return send(res, 400, { error: '닉네임을 1~24자로 입력하세요.' });
        const existing = Object.values(state.players).find(p => p.name.toLowerCase() === name.toLowerCase());
        if (existing) return send(res, 409, { error: '이미 사용 중인 닉네임입니다. 다른 이름을 입력하세요.' });
        const id = crypto.randomUUID();
        state.players[id] = { id, name, cash: START_CASH, holdings: {}, fomo: 0, initialValue: START_CASH, trades: 0, joinedAt: Date.now(), lastActionAt: Date.now() };
        addNews({ ticker: null, kind: 'system', tone: 'neutral', title: 'New investor joined', text: `${name} has entered the market.`, clue: 'All investors share the same market and price history.' });
        saveState();
        return send(res, 200, { playerId: id, state: publicState(id) });
      }
      if (req.method === 'POST' && req.url === '/api/trade') {
        const body = await readJson(req);
        const p = getPlayer(String(body.playerId || ''));
        if (!p) return send(res, 401, { error: '먼저 닉네임으로 입장하세요.' });
        const result = trade(p, String(body.ticker || '').toUpperCase(), String(body.side || ''), Number(body.quantity));
        return send(res, 200, { ...result, state: publicState(p.id) });
      }
      if (req.method === 'POST' && req.url === '/api/advance') {
        const body = await readJson(req);
        const p = getPlayer(String(body.playerId || ''));
        if (!p) return send(res, 401, { error: '먼저 닉네임으로 입장하세요.' });
        // Shared turn: any connected player can advance one simulated trading day.
        advanceOneDay();
        return send(res, 200, { ok: true, state: publicState(p.id) });
      }
      if (req.method === 'POST' && req.url === '/api/reset') {
        const body = await readJson(req);
        if (String(body.confirm || '') !== 'RESET-MARKET') return send(res, 400, { error: '초기화 확인 값이 올바르지 않습니다.' });
        state = createInitialState();
        saveState();
        return send(res, 200, { ok: true, message: '시장 초기화 완료' });
      }
      return send(res, 404, { error: 'API 경로를 찾을 수 없습니다.' });
    } catch (err) {
      return send(res, 400, { error: err.message || '요청 처리 중 오류가 발생했습니다.' });
    }
  }
  serveStatic(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Fictional Market Sim is running at http://localhost:${PORT}`);
  console.log('For LAN play, other devices can use this computer’s local IP address and the same port.');
});

process.on('SIGINT', () => { try { fs.writeFileSync(STATE_FILE, JSON.stringify(state), 'utf8'); } catch (_) {} process.exit(0); });
process.on('SIGTERM', () => { try { fs.writeFileSync(STATE_FILE, JSON.stringify(state), 'utf8'); } catch (_) {} process.exit(0); });
