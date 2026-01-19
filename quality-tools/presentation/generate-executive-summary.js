
const fs = require('fs');
const path = require('path');

const WORKSPACE = process.env.WORKSPACE || '.';

const NORMALIZED_DIR = path.resolve(WORKSPACE, 'quality-data-normalized');
const CLUSTER_FILE = path.resolve(WORKSPACE, 'quality-data-clusters', 'clusters.json');
const RCA_FILE = path.resolve(WORKSPACE, 'quality-data-rca', 'rca-report.json');
const OUT_DIR = path.resolve(WORKSPACE, 'quality-presentation');
const OUT_FILE = path.join(OUT_DIR, 'executive-summary.html');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ---------- Helpers ----------
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

// ---------- Compute Critical Pass Rate ----------
function computeCriticalPassRate() {
  const files = fs.readdirSync(NORMALIZED_DIR)
    .filter(f => f.startsWith('run_') && f.endsWith('.csv'))
    .sort((a,b)=>Number(a.replace(/\D/g,'')) - Number(b.replace(/\D/g,'')));

  if (files.length === 0) return 0;

  const latest = files[files.length - 1];
  const data = readCSV(path.join(NORMALIZED_DIR, latest));

  const critical = data.filter(d => d.risk === 'critical');
  if (critical.length === 0) return 100;

  const passed = critical.filter(d => d.status === 'passed').length;
  return Math.round((passed / critical.length) * 100);
}

// ---------- Load Clusters ----------
function getRecurringDefectCount() {
  if (!fs.existsSync(CLUSTER_FILE)) return 0;
  const clusters = JSON.parse(fs.readFileSync(CLUSTER_FILE));
  return clusters.length;
}

// ---------- Load RCA ----------
function getTopRcaSummary() {
  if (!fs.existsSync(RCA_FILE)) return "No RCA data available.";
  const rca = JSON.parse(fs.readFileSync(RCA_FILE));
  if (rca.length === 0) return "No recurring failures detected.";
  return rca[0].summary;
}

// ---------- Release Threshold Logic ----------
function computeReleaseStatus(criticalPassRate, recurringDefects) {
  if (criticalPassRate < 100) {
    return { status: "NOT READY", color: "red" };
  }
  if (recurringDefects > 0) {
    return { status: "REVIEW REQUIRED", color: "orange" };
  }
  return { status: "READY", color: "green" };
}

// ---------- Generate HTML ----------
function generateHtml(metrics) {
  return `
<html>
<head>
<title>Executive Quality Summary</title>
<style>
body { font-family: Arial; margin:40px; background:#f5f5f5; }
.card { background:white; padding:20px; margin-bottom:20px; border-radius:8px; box-shadow:0 0 5px #ccc; }
.status { font-size:22px; font-weight:bold; color:${metrics.release.color}; }
h1 { color:#2c3e50; }
</style>
</head>
<body>

<h1>Release Executive Quality Summary</h1>

<div class="card">
  <div>Release Readiness Status:</div>
  <div class="status">${metrics.release.status}</div>
</div>

<div class="card">
  <b>Critical Pass Rate:</b> ${metrics.criticalPassRate}%
</div>

<div class="card">
  <b>Recurring Defect Clusters:</b> ${metrics.recurringDefects}
</div>

<div class="card">
  <b>AI RCA Recommendation:</b><br/><br/>
  ${metrics.rcaSummary}
</div>

<div class="card">
  <small>Last Updated from Jenkins Run: #${metrics.buildNumber}</small>
</div>

</body>
</html>
`;
}

// ---------- Main ----------
function main() {
  const criticalPassRate = computeCriticalPassRate();
  const recurringDefects = getRecurringDefectCount();
  const rcaSummary = getTopRcaSummary();
  const buildNumber = process.env.BUILD_NUMBER || "Local";

  const release = computeReleaseStatus(criticalPassRate, recurringDefects);

  const html = generateHtml({
    criticalPassRate,
    recurringDefects,
    rcaSummary,
    buildNumber,
    release
  });

  fs.writeFileSync(OUT_FILE, html);
  console.log("Executive Summary generated at:", OUT_FILE);
}

main();
