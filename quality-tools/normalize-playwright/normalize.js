const fs = require('fs');
const path = require('path');

const RESULTS_DIR = 'test-results';
const OUTPUT_DIR = 'quality-data-normalized';

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

const files = fs.readdirSync(RESULTS_DIR).filter(f => f.endsWith('.json'));

files.forEach(file => {
  const json = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file)));

  let csv = 'TestName,Status,Duration\n';

  json.suites.forEach(suite => {
    suite.specs.forEach(spec => {
      spec.tests.forEach(test => {

        const testName = test.location.file.replace(/\\/g,'/');

        test.results.forEach(result => {
          let status = result.status;
          if (result.retry > 0 && status === 'passed') status = 'flaky';

          const duration = result.duration || 0;

          csv += `${testName},${status},${duration}\n`;
        });

      });
    });
  });

  const runId = file.replace('.json','');
  fs.writeFileSync(path.join(OUTPUT_DIR, `${runId}.csv`), csv);
  console.log(`Normalized → ${runId}.csv`);
});
