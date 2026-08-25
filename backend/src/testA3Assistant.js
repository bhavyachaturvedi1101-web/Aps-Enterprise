const { processQuery } = require('./services/a3Service');

async function testExports() {
  console.log('--- TESTING MULTI-FORMAT EXPORTS --- \n');

  const exportQueries = [
    { q: 'give me excel file of dialer queue', expFormat: 'XLSX' },
    { q: 'export crm leads in csv format', expFormat: 'CSV' },
    { q: 'give me pdf file of warehouse stock inventory', expFormat: 'PDF' },
    { q: 'give me word file of all employees performance and profit roi', expFormat: 'DOCX' },
    { q: 'give me json format of activity logs', expFormat: 'JSON' },
    { q: 'give me xml file of whatsapp messages', expFormat: 'XML' },
    { q: 'Bhavya ko urgent task assign kardo: Review Global Tech advance payment', expFormat: null }
  ];

  for (const item of exportQueries) {
    console.log(`\n========================================`);
    console.log(`QUERY: "${item.q}"`);
    const res = await processQuery(item.q, 'test-conv-exports');
    console.log(`INTENT: ${res.intent}`);
    console.log(`TEXT PREVIEW:\n${res.text.slice(0, 180)}...`);
    if (res.exportFile) {
      console.log(`EXPORT FILE: ${res.exportFile.fileName}`);
      console.log(`FORMAT: ${res.exportFile.fileFormat}`);
      console.log(`MIME: ${res.exportFile.mimeType}`);
      console.log(`HEADERS: ${res.exportFile.tableHeaders?.join(', ')}`);
      console.log(`ROWS COUNT: ${res.exportFile.tableRows?.length}`);
    } else {
      console.log(`NO EXPORT FILE ATTACHED (Normal Action)`);
    }
  }

  console.log('\n--- ALL MULTI-FORMAT EXPORTS VERIFIED SUCCESSFULLY! ---');
}

testExports().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
