const tests = [
  'name: Siddharth Roy, role: Super Admin',
  'add user with name Kavita Singhal and role as Accountant',
  'create user Vikram Rathore role Admin',
  'add user named Priya Patel with role Telecaller',
  'user: Aman Verma, role: Operations'
];

async function run() {
  for (const q of tests) {
    const res = await fetch('http://localhost:5000/api/a3/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, conversationId: 'test-batch' })
    }).then(r => r.json());
    console.log(`\n=== Query: "${q}" ===`);
    console.log('Intent:', res.intent);
    console.log('Created User:', res.table ? res.table[0] : 'No table');
  }

  const users = await fetch('http://localhost:5000/api/users').then(r => r.json());
  console.log('\n=== USERS & ROLES LIVE DIRECTORY ===');
  console.log('Total Count:', users.count);
  console.table(users.users.map(u => ({ id: u.id, name: u.name, role: u.role, module: u.module })));
}

run();
