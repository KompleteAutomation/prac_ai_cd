const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const NORMALIZED_DIR = 'quality-data-normalized';
const CLUSTER_FILE = 'quality-data-clusters/clusters.json';
const OUTPUT_DIR = 'quality-ml-dataset';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'test-features.csv');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// ---------- Load Failure Clusters ----------
let clusterMap = {};
if (fs.existsSync(CLUSTER_FILE)) {
  const clusters = JSON.parse(fs.readFileSync(CLUSTER_FILE));
  clusters.forEach(c => {
    c.tests.forEach(t => {
      clusterMap[t] = (clusterMap[t] || 0) + 1;
    });
  });
}

// ---------- Load Git Changed Files ----------
let changedFiles = [];
try {
  const diff = execSync('git diff --name-only HEAD~1').toString();
  changedFiles = diff.split('\n').filter(Boolean);
} catch {
  console.log("No git history available — skipping change detection");
}

// ---------- Aggregate Historical Runs ----------
const files = fs.readdirSync(NORMALIZED_DIR).filter(f => f.endsWith('.csv'));

let testStats = {};

files.forEach(file => {
  const data = fs.readFileSync(path.join(NORMALIZED_DIR, file), 'utf-8').split('\n').slice(1);
  data.forEach(row => {
    if (!row.trim()) return;
    const [testName, status, duration] = row.split(',');

    if (!testStats[testName]) {
      testStats[testName] = {
        total: 0,
        passed: 0,
        failed: 0,
        flaky: 0,
        durations: [],
        lastOutcome: status
      };
    }

    testStats[testName].total++;
    testStats[testName].durations.push(Number(duration));
    testStats[testName].lastOutcome = status;

    if (status === 'passed') testStats[testName].passed++;
    if (status === 'failed') testStats[testName].failed++;
    if (status === 'flaky') testStats[testName].flaky++;
  });
});

// ---------- Write Feature CSV ----------
let csv = 'TestName,PassRate,FlakyRate,AvgDuration,LastOutcome,FailureClusterCount,ChangedModuleHit\n';

Object.keys(testStats).forEach(test => {
  const t = testStats[test];
  const passRate = (t.passed / t.total).toFixed(2);
  const flakyRate = (t.flaky / t.total).toFixed(2);
  const avgDuration = Math.round(t.durations.reduce((a,b)=>a+b,0) / t.durations.length);
  const lastOutcome = t.lastOutcome;
  const clusterCount = clusterMap[test] || 0;

  // Simple change mapping: if test file name matches changed file name
  const changedHit = changedFiles.some(f => f.includes(test)) ? 'YES' : 'NO';

  csv += `${test},${passRate},${flakyRate},${avgDuration},${lastOutcome},${clusterCount},${changedHit}\n`;
});

fs.writeFileSync(OUTPUT_FILE, csv);
console.log("ML Feature Dataset generated →", OUTPUT_FILE);
