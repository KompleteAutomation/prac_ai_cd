const fs = require('fs');
const path = require('path');

const NORMALIZED_DIR = 'quality-data-normalized';
const REPORT_DIR = 'quality-data-validation';
const REPORT_FILE = path.join(REPORT_DIR, 'validation-report.txt');

if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR);

const files = fs.readdirSync(NORMALIZED_DIR).filter(f => f.endsWith('.csv'));

let issues = [];
let totalRows = 0;
let badRows = 0;

files.forEach(file => {
  const filePath = path.join(NORMALIZED_DIR, file);
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').slice(1);

  lines.forEach((line, index) => {
    if (!line.trim()) return;
    totalRows++;

    const parts = line.split(',');
    const testName = parts[0]?.trim();
    const status = parts[1]?.trim();
    const duration = parts[2]?.trim();

    let rowIssues = [];

    // Validate Test Name
    if (!testName || testName.match(/^"?\d+"?$/)) {
      rowIssues.push('Invalid TestName');
    }

    // Validate Status
    if (!['passed', 'failed', 'flaky'].includes(status)) {
      rowIssues.push('Invalid Status');
    }

    // Validate Duration
    const d = Number(duration);
    if (isNaN(d) || d <= 0) {
      rowIssues.push('Invalid Duration');
    }

    if (rowIssues.length > 0) {
      badRows++;
      issues.push(`${file} [Row ${index+2}] → ${rowIssues.join(', ')} → ${line}`);
    }
  });
});

// Write Report
let report = '';
report += `Validation Summary\n`;
report += `====================\n`;
report += `Files Checked: ${files.length}\n`;
report += `Total Rows: ${totalRows}\n`;
report += `Invalid Rows: ${badRows}\n\n`;

if (issues.length > 0) {
  report += `Detailed Issues:\n--------------------\n`;
  issues.forEach(i => report += i + '\n');
} else {
  report += `No issues found. All normalized data is valid.\n`;
}

fs.writeFileSync(REPORT_FILE, report);

console.log(report);

// Optional: Fail CI if bad rows exist
if (badRows > 0) {
  console.error(`❌ Data validation failed. ${badRows} invalid rows detected.`);
  process.exit(1);
} else {
  console.log('✅ Normalized data validation passed.');
}
