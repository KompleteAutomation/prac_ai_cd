const fs = require('fs');
const path = require('path');

const INPUT_FILE = 'quality-ml-dataset/test-features.csv';
const OUTPUT_DIR = 'quality-ml-results';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'prioritized-tests.csv');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

const rows = fs.readFileSync(INPUT_FILE, 'utf-8').split('\n').slice(1);

let scored = [];

rows.forEach(row => {
  if (!row.trim()) return;
  const [name, passRate, flakyRate, avgDuration, lastOutcome, clusterCount, changedHit] = row.split(',');

  let score = 0;
  let reasons = [];

  if (Number(flakyRate) > 0.1) { score += 30; reasons.push("High flakiness"); }
  if (Number(clusterCount) > 0) { score += 25; reasons.push("Recurring defect cluster"); }
  if (changedHit === 'YES') { score += 20; reasons.push("Impacted by recent code change"); }
  if (lastOutcome === 'failed') { score += 15; reasons.push("Failed in last run"); }
  if (Number(avgDuration) < 40000) { score += 10; reasons.push("Fast to execute"); }

  scored.push({ name, score, reason: reasons.join(" + ") });
});

scored.sort((a,b)=> b.score - a.score);

let csv = "TestName,PriorityScore,Reason\n";
scored.forEach(s => csv += `${s.name},${s.score},"${s.reason}"\n`);

fs.writeFileSync(OUTPUT_FILE, csv);
console.log("Priority scoring generated →", OUTPUT_FILE);
