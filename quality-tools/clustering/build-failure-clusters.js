const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(process.env.WORKSPACE || '.', 'quality-data-normalized');
const OUT_DIR = path.resolve(process.env.WORKSPACE || '.', 'quality-data-clusters');
const OUT_FILE = path.join(OUT_DIR, 'clusters.json');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function readCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
  const headers = content[0].split(',');
  return content.slice(1).map(line => {
    const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i].replace(/(^"|"$)/g, ''));
    return obj;
  });
}

function loadAllFailures() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('run_') && f.endsWith('.csv'));
  const failures = [];

  files.forEach(f => {
    const runId = f.replace('run_', '').replace('.csv', '');
    const records = readCSV(path.join(DATA_DIR, f));

    records
      .filter(r => r.status === 'failed')
      .forEach(r => {
        r.run_id = runId;
        failures.push(r);
      });
  });

  return failures;
}

function buildClusters(failures) {
  const clusterMap = {};

  failures.forEach(f => {
    const hash = f.stack_trace_hash || 'no_hash';

    if (!clusterMap[hash]) {
      clusterMap[hash] = {
        cluster_id: hash,
        occurrences: 0,
        first_seen_run: f.run_id,
        last_seen_run: f.run_id,
        impacted_tests: new Set(),
        error_message_sample: f.error_message
      };
    }

    const cluster = clusterMap[hash];
    cluster.occurrences++;
    cluster.impacted_tests.add(f.test_title);

    if (Number(f.run_id) < Number(cluster.first_seen_run))
      cluster.first_seen_run = f.run_id;

    if (Number(f.run_id) > Number(cluster.last_seen_run))
      cluster.last_seen_run = f.run_id;
  });

  // Convert Set → Array for JSON
  return Object.values(clusterMap).map(c => ({
    cluster_id: c.cluster_id,
    occurrences: c.occurrences,
    first_seen_run: c.first_seen_run,
    last_seen_run: c.last_seen_run,
    impacted_tests: Array.from(c.impacted_tests),
    error_message_sample: c.error_message_sample
  }))
  .sort((a,b) => b.occurrences - a.occurrences);
}

function main() {
  const failures = loadAllFailures();
  const clusters = buildClusters(failures);

  fs.writeFileSync(OUT_FILE, JSON.stringify(clusters, null, 2));
  console.log("Failure clusters generated at:", OUT_FILE);
}

main();
