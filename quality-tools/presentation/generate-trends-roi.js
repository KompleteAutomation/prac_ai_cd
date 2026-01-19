const fs = require('fs');
const path = require('path');

const WORKSPACE = process.env.WORKSPACE || '.';
const NORMALIZED_DIR = path.resolve(WORKSPACE, 'quality-data-normalized');
const CLUSTER_FILE = path.resolve(WORKSPACE, 'quality-data-clusters', 'clusters.json');
const OUT_DIR = path.resolve(WORKSPACE, 'quality-presentation');
const OUT_FILE = path.join(OUT_DIR, 'trends-roi.html');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function readCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
  const headers = content[0].split(',');
  return content.slice(1).map(line => {
    const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i]?.replace(/(^"|"$)/g, '') || '');
    return obj;
  });
}

function loadRuns() {
  const files = fs.readdirSync(NORMALIZED_DIR)
    .filter(f => f.startsWith('run_') && f.endsWith('.csv'))
    .sort((a,b)=>Number(a.replace(/\D/g,'')) - Number(b.replace(/\D/g,'')));

  const runs = [];

  files.forEach(f => {
    const runId = f.replace('run_','').replace('.csv','');
    const data = readCSV(path.join(NORMALIZED_DIR,f));

    const critical = data.filter(d => d.risk === 'critical');
    const passedCritical = critical.filter(d => d.status === 'passed').length;
    const criticalRate = critical.length === 0 ? 100 : Math.round((passedCritical / critical.length)*100);

    const totalDuration = data.reduce((sum,d)=> sum + Number(d.duration_ms || 0), 0);

    const flaky = data.filter(d => Number(d.retry_count) > 0).length;

    runs.push({
      runId,
      criticalRate,
      totalDuration,
      flakyCount: flaky
    });
  });

  return runs;
}

function loadRecurringDefects() {
  if (!fs.existsSync(CLUSTER_FILE)) return 0;
  const clusters = JSON.parse(fs.readFileSync(CLUSTER_FILE));
  return clusters.length;
}

function generateHtml(runs, recurringDefects) {

  const runLabels = runs.map(r=>r.runId);
  const criticalRates = runs.map(r=>r.criticalRate);
  const durations = runs.map(r=>r.totalDuration);
  const flakyCounts = runs.map(r=>r.flakyCount);

  return `
<html>
<head>
<title>Quality Trends & Automation ROI</title>
<style>
body { font-family: Arial; margin:30px; background:#f4f6f7;}
h1 { color:#2c3e50; }
.chart { margin-bottom:40px; padding:15px; background:white; border-radius:8px; box-shadow:0 0 5px #ccc;}
.bar { display:inline-block; margin-right:6px; vertical-align:bottom; border-radius:3px;}
.label { font-size:12px; }
</style>
</head>
<body>

<h1>Quality Trends & Automation ROI</h1>

<div class="chart">
<h3>Critical Pass Rate Trend (%)</h3>
${criticalRates.map((v,i)=> 
  `<div class="bar" style="height:${Math.max(v,20)}px;width:24px;background:#3498db" title="Run ${runLabels[i]} : ${v}%"></div>`
).join('')}
</div>

<div class="chart">
<h3>Execution Duration Trend (ms)</h3>
${durations.map((v,i)=> 
  `<div class="bar" style="height:${Math.max(Math.round(v/20),20)}px;width:24px;background:#9b59b6" title="Run ${runLabels[i]} : ${v} ms"></div>`
).join('')}
</div>

<div class="chart">
<h3>Flaky Test Trend</h3>
${flakyCounts.map((v,i)=> 
  `<div class="bar" style="height:${Math.max(v*25,20)}px;width:24px;background:#f39c12" title="Run ${runLabels[i]} : ${v} flaky tests"></div>`
).join('')}
</div>

<div class="chart">
<h3>Recurring Defect Clusters: ${recurringDefects}</h3>
</div>

<div class="chart">
<b>ROI Interpretation:</b>
<ul>
<li>Increasing blue bars → improved release stability</li>
<li>Lower orange bars → higher automation trust</li>
<li>Stable or decreasing defect clusters → better product quality</li>
<li>Purple duration trend → CI performance tracking</li>
</ul>
</div>

</body>
</html>
`;
}

function main() {
  const runs = loadRuns();
  const recurringDefects = loadRecurringDefects();
  const html = generateHtml(runs, recurringDefects);
  fs.writeFileSync(OUT_FILE, html);
  console.log("Trends & ROI dashboard generated at:", OUT_FILE);
}

main();
