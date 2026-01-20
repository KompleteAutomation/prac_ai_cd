/**
 * Build ML-ready feature dataset from normalized Playwright CSVs
 * Ensures no missing / NaN values
 */

const fs = require('fs');
const path = require('path');

const normalizedDir = path.join(process.cwd(), 'quality-data-normalized');
const clusterFile = path.join(process.cwd(), 'quality-data-clusters', 'clusters.json');
const outputDir = path.join(process.cwd(), 'quality-ml-dataset');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

let clusterMap = {};
if (fs.existsSync(clusterFile)) {
  const clusters = JSON.parse(fs.readFileSync(clusterFile, 'utf-8'));
  clusters.forEach(c => {
    c.tests.forEach(t => clusterMap[t] = c.clusterId);
  });
}

const files = fs.readdirSync(normalizedDir).filter(f => f.endsWith('.csv'));

let testStats = {};

files.forEach(file => {
  const rows = fs.readFileSync(path.join(normalizedDir, file), 'utf-8')
                 .split('\n').slice(1);

  rows.forEach(line => {
    if (!line.trim()) return;

    const cols = line.split('","').map(c => c.replace(/"/g,''));

    const testName = cols[2];
    const fileName = cols[3];
    const status = cols[4];
    const duration = Number(cols[5]) || 0;
    const retries = Number(cols[6]) || 0;

    if (!testName) return;

    if (!testStats[testName]) {
      testStats[testName] = {
        testName,
        file: fileName,
        totalRuns: 0,
        passCount: 0,
        failCount: 0,
        totalDuration: 0,
        totalRetries: 0,
        lastOutcome: status,
        clusterId: clusterMap[testName] || 'none',
        businessRisk: 3   // default medium risk
      };
    }

    const t = testStats[testName];
    t.totalRuns++;
    t.totalDuration += duration;
    t.totalRetries += retries;
    t.lastOutcome = status;

    if (status === 'passed') t.passCount++;
    if (status === 'failed') t.failCount++;
  });
});

let csv = 'testName,file,totalRuns,passCount,failCount,failureRate,avgDuration,retryRate,lastOutcome,clusterId,businessRisk\n';

Object.values(testStats).forEach(t => {
  const failureRate = t.totalRuns ? (t.failCount / t.totalRuns).toFixed(3) : 0;
  const avgDuration = t.totalRuns ? Math.round(t.totalDuration / t.totalRuns) : 0;
  const retryRate = t.totalRuns ? (t.totalRetries / t.totalRuns).toFixed(3) : 0;

  csv += `"${t.testName}","${t.file}","${t.totalRuns}","${t.passCount}","${t.failCount}","${failureRate}","${avgDuration}","${retryRate}","${t.lastOutcome}","${t.clusterId}","${t.businessRisk}"\n`;
});

fs.writeFileSync(path.join(outputDir, 'test-features.csv'), csv);

console.log(`✅ Feature dataset generated: ${outputDir}\\test-features.csv`);
console.log(`📊 Tests processed: ${Object.keys(testStats).length}`);
