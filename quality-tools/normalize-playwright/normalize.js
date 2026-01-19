/**
 * Normalize Playwright JSON reports into CSV
 * Safe against missing fields
 */

const fs = require('fs');
const path = require('path');

const inputDir = path.join(process.cwd(), 'quality-data');
const outputDir = path.join(process.cwd(), 'quality-data-normalized');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.json'));

files.forEach(file => {
  const runId = file.replace('run_', '').replace('.json', '');
  const raw = fs.readFileSync(path.join(inputDir, file), 'utf-8');
  const json = JSON.parse(raw);

  // Playwright JSON reporter structure (v1.57+)
  const tests = json.tests || [];

  if (!tests.length) {
    console.log(`⚠ No tests found in ${file}, skipping`);
    return;
  }

  let rows = [];

  tests.forEach(t => {
    rows.push({
      run: runId,
      testId: t.testId || '',
      testName: t.title || '',
      file: t.location?.file || '',
      status: t.outcome || '',
      duration: t.duration || 0,
      retries: t.retry || 0,
      error: t.errors && t.errors.length > 0 ? t.errors[0].message : ''
    });
  });

  const csvHeader = 'run,testId,testName,file,status,duration,retries,error\n';

  const csvBody = rows.map(r =>
    `${r.run},${r.testId},${r.testName},${r.file},${r.status},${r.duration},${r.retries},${r.error.replace(/"/g, '')}`
  ).join('\n');

  fs.writeFileSync(
    path.join(outputDir, `run_${runId}.csv`),
    csvHeader + csvBody
  );

  console.log(`✅ Normalized run ${runId}`);
});

console.log('🎯 Normalization complete');
