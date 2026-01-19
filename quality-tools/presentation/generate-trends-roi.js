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
<title>Quality Trends & ROI</title>
<style>
body { font-family: Arial; margin:30px; }
h1 { color:#2c3e50; }
.chart { margin-bottom:40px; }
.bar { display:inline-block; margin-right:4px; background:#3498db; vertical-align:bottom; }
.label { font-size:12px; }
</style>
</head>
<body>

<h1>Quality Trends & Automation ROI</h1>

<h3>Critical Pass Rate Trend (%)</h3>
<div class="chart">
${criticalRates.map((v,i)=> `<div class="bar" style="height:${v}px;width:20px" title="Run ${runLabels[i]}: ${v}%"></div>`).join('')}
</div>

<h3>Execution Duration Trend (ms)</h3>
<div class="chart">
${durations.map((v,i)=> `<div class="bar" style="height:${Math.round(v/50)}px;width:20px;background:#9b59b6" title="Run ${runLabels[i]}: ${v} ms"></div>`).join('')}
</div>

<h3>Flaky Test Trend</h3>
<div class="chart">
${flakyCounts.map((v,i)=> `<div class="bar" style="height:${v*20}px;width:20px;background:#f39c12" title="Run ${runLabels[i]}: ${v} flaky"></div>`).join('')}
</div>

<h3>Recurring Defect Clusters: ${recurringDefects}</h3>

<p><b>ROI Interpretation:</b></p>
<ul>
<li>Rising critical pass rate → improved release stability</li>
<li>Reducing flaky trend → higher automation trust</li>
<li>Stable or falling defect clusters → better product quality</li>
<li>Execution time trend → CI efficiency tracking</li>
</ul>

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
