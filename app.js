// Shared helpers for the static snooker stats site.
const PAGES = [
  ["index.html", "Overview"],
  ["leaderboard.html", "Players"],
  ["records.html", "Records"],
  ["tournaments.html", "Tournaments"],
  ["insights.html", "Insights"],
];

function header() {
  const here = location.pathname.split("/").pop() || "index.html";
  const nav = PAGES.map(([href, label]) =>
    `<a href="${href}" class="${href === here ? "on" : ""}">${label}</a>`).join("");
  document.body.insertAdjacentHTML("afterbegin",
    `<header><div class="in"><a class="brand" href="index.html">Snooker stats</a><nav>${nav}</nav></div></header>`);
  document.body.insertAdjacentHTML("beforeend",
    `<footer>Built from legacy WST/EBSA score logs and the wst.tv feed.</footer>`);
}

const cache = {};
async function load(path) {
  if (!cache[path]) cache[path] = fetch(path).then(r => {
    if (!r.ok) throw new Error(path + ": " + r.status);
    return r.json();
  });
  return cache[path];
}

const qs = k => new URLSearchParams(location.search).get(k);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";
const num = v => v == null ? "" : (typeof v === "number" ? v.toLocaleString("en-GB") : v);
const mmss = s => s == null ? "" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const season = s => s ? `${s - 1}/${String(s).slice(2)}` : "unknown";
const playerLink = n => `<a href="player.html?p=${encodeURIComponent(slug(n))}">${esc(n)}</a>`;
const matchLink = (tid, mid, text) =>
  `<a href="match.html?t=${encodeURIComponent(slug(tid))}&m=${encodeURIComponent(mid)}">${text}</a>`;

// Shot rows of a frame (`f.sh`): [player, kind, ball, points, clock, shot_time, inferred];
// kind is frame_start, shot (potted nothing: a miss or safety), pot or foul.
const BALL = {Red: "#c62828", Yellow: "#f9d71c", Green: "#2e7d32", Brown: "#6d4c41", Blue: "#1565c0", Pink: "#f48fb1", Black: "#212121"};
const isLive = f => f.sh.some(s => s[1] === "shot");  // live captures have every shot, other sources pots and fouls only
function ball(s) {
  const name = s[2] || `${s[3]} points, ball unknown`;
  return `<span class="ball${s[6] ? " guess" : ""}" style="background:${BALL[s[2]] || "#999"}" title="${esc(name)}${s[6] ? " (inferred)" : ""}"></span>`;
}
// The shot rows of each visit in `f.v` (null where they can't be lined up).
function visitShots(f) {
  const pots = f.sh.filter(s => s[1] === "pot" || s[1] === "foul");
  let i = 0;
  return f.v.map(([pl, pts, foul]) => {
    if (foul) return pots[i] && pots[i][1] === "foul" ? [pots[i++]] : null;
    const out = [];
    let sum = 0;
    while (sum < pts && pots[i] && pots[i][1] === "pot" && pots[i][0] === pl) { out.push(pots[i]); sum += pots[i++][3] || 0; }
    return sum === pts ? out : null;
  });
}

// Sortable table. cols: [{k, label, fmt?, l?, html?}]
function table(el, cols, rows, opts = {}) {
  let sortKey = opts.sort ?? null, asc = !!opts.asc;
  const limit = opts.limit ?? 500;
  function render() {
    let data = rows.slice();
    if (sortKey) {
      data.sort((a, b) => {
        const x = a[sortKey], y = b[sortKey];
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        const c = typeof x === "string" ? x.localeCompare(y) : x - y;
        return asc ? c : -c;
      });
    }
    const head = cols.map(c => `<th data-k="${c.k}" class="${c.l ? "l" : ""} ${c.k === sortKey ? "sorted" + (asc ? " asc" : "") : ""}" title="${esc(c.title || "")}">${c.label}</th>`).join("");
    const body = data.slice(0, limit).map((r, i) => "<tr>" + cols.map(c => {
      const v = c.k === "#" ? i + 1 : r[c.k];
      const out = c.html ? c.html(r, v) : esc(c.fmt ? c.fmt(v, r) : num(v));
      return `<td class="${c.l ? "l" : ""}">${out}</td>`;
    }).join("") + "</tr>").join("");
    el.innerHTML = `<div class="scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>` +
      (data.length > limit ? `<p class="muted small">Showing ${limit} of ${data.length}</p>` : "");
    el.querySelectorAll("th").forEach(th => th.onclick = () => {
      const k = th.dataset.k;
      if (k === "#") return;
      if (sortKey === k) asc = !asc; else { sortKey = k; asc = false; }
      render();
    });
  }
  render();
}

header();
