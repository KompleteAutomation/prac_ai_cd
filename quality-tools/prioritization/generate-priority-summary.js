const fs = require('fs');
const path = require('path');

const INPUT_FILE = 'quality-ml-results/prioritized-tests.csv';
const OUTPUT_DIR = 'quality-presentation';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'test-priority-summary.html');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

const rows = fs.readFileSync(INPUT_FILE, 'utf-8').split('\n').slice(1);

let high = [], medium = [], low = [];

rows.forEach(r => {
  if (!r.trim()) return;
  const [name, score, reason] = r.split(',');

  const s = Number(score);
  if (s >= 60) high.push({name,reason});
  else if (s >= 30) medium.push({name,reason});
  else low.push({name,reason});
});

function buildList(title, arr) {
  let html = `<h2>${title}</h2><ul>`;
  arr.forEach(t => html += `<li><b>${t.name}</b> — ${t.reason}</li>`);
  html += "</ul>";
  return html;
}

let html = `
<html>
<head><title>Test Prioritization Summary</title></head>
<body style="font-family:Arial;padding:20px">
<h1>ML-Based Test Prioritization Recommendation</h1>
${buildList("High Priority (Run First)", high)}
${buildList("Medium Priority", medium)}
${buildList("Low Priority", low)}
</body></html>
`;

fs.writeFileSync(OUTPUT_FILE, html);
console.log("Priority Summary generated →", OUTPUT_FILE);
