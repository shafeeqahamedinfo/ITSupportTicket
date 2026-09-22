/**
 * system_test.js – Automated System Verification & Integration Test Suite
 * Tests all 10 completed phases of SmartCampus ITCare.
 */
const http = require('http');

const API_BASE = 'http://localhost:5000/api';

async function request(endpoint, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${endpoint}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTestSuite() {
  console.log('===========================================================');
  console.log(' 🧪 SmartCampus ITCare – Automated Integration Test Suite');
  console.log('===========================================================');
  console.log('');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASSED: ${name}`);
      passed++;
    } catch (err) {
      console.log(`  ❌ FAILED: ${name} -> ${err.message}`);
      failed++;
    }
  }

  let adminToken, staffToken, userToken;

  // 1. System Health Check
  await test('1. System Health Check (/api/health)', async () => {
    const res = await request('/health');
    if (res.status !== 200 || !res.body.success) throw new Error('Health check returned non-200');
  });

  // 2. Authentication
  await test('2. Admin Account Authentication', async () => {
    const res = await request('/auth/login', 'POST', {
      email: 'admin@smartcampus.edu',
      password: 'Admin@1234',
    });
    if (res.status !== 200 || !res.body.token) throw new Error('Admin login failed');
    adminToken = res.body.token;
  });

  await test('3. Staff Account Authentication', async () => {
    const res = await request('/auth/login', 'POST', {
      email: 'ravi.itstaff@smartcampus.edu',
      password: 'Staff@1234',
    });
    if (res.status !== 200 || !res.body.token) throw new Error('Staff login failed');
    staffToken = res.body.token;
  });

  await test('4. User Account Authentication', async () => {
    const res = await request('/auth/login', 'POST', {
      email: 'teststudent@smartcampus.edu',
      password: 'Test@1234',
    });
    if (res.status !== 200 || !res.body.token) throw new Error('User login failed');
    userToken = res.body.token;
  });

  // 3. User Profile API
  await test('5. User Profile Verification (/api/auth/profile)', async () => {
    const res = await request('/auth/profile', 'GET', null, userToken);
    if (res.status !== 200 || !res.body.user) throw new Error('Failed to fetch profile');
  });

  // 4. Knowledge Base & Search
  await test('6. Knowledge Base Articles Query & Search', async () => {
    const res = await request('/knowledge-base?search=wifi', 'GET');
    if (res.status !== 200 || !res.body.articles) throw new Error('KB search failed');
  });

  // 5. SLA Engine
  await test('7. SLA Configs & Target Deadlines (/api/sla/configs)', async () => {
    const res = await request('/sla/configs', 'GET', null, adminToken);
    if (res.status !== 200 || !res.body.configs) throw new Error('SLA configs failed');
  });

  await test('8. SLA Compliance & Metrics Report (/api/sla/reports)', async () => {
    const res = await request('/sla/reports', 'GET', null, adminToken);
    if (res.status !== 200 || res.body.metrics.complianceRate === undefined) throw new Error('SLA report failed');
  });

  // 6. CSAT Feedback Metrics
  await test('9. CSAT Feedback Analytics (/api/feedback/csat)', async () => {
    const res = await request('/feedback/csat', 'GET', null, adminToken);
    if (res.status !== 200 || res.body.metrics.csatScore === undefined) throw new Error('CSAT metrics failed');
  });

  // 7. System Admin Analytics
  await test('10. Admin Dashboard System Aggregation (/api/admin/stats)', async () => {
    const res = await request('/admin/stats', 'GET', null, adminToken);
    if (res.status !== 200 || !res.body.stats) throw new Error('Admin stats failed');
  });

  // 8. New Feature 1: Ticket Creation & CSV Export
  let testTicketId;
  await test('11. Create Test Ticket & CSV Export (/api/tickets/export/csv)', async () => {
    const createRes = await request('/tickets', 'POST', {
      title: 'Wi-Fi Connection Issue on Campus Library 2nd Floor',
      description: 'Unable to connect to Campus-WiFi network from laptop. Keeps prompting for re-authentication.',
      category: 'Wi-Fi',
      priority: 'HIGH',
      department: 'Computer Science',
      affectedUsers: 1,
      serviceImpact: 'MINOR',
    }, userToken);

    if (createRes.status !== 201 || !createRes.body.ticket) throw new Error('Ticket creation failed');
    testTicketId = createRes.body.ticket.ticketId || createRes.body.ticket._id;

    const csvRes = await request('/tickets/export/csv', 'GET', null, userToken);
    if (csvRes.status !== 200 || typeof csvRes.body !== 'string' || !csvRes.body.includes('Ticket ID')) {
      throw new Error('CSV Export failed or returned invalid header');
    }
  });

  // 9. New Feature 2: Real-Time Live Comments & Discussion Chat
  await test('12. Real-Time Ticket Discussion Comment (/api/tickets/:id/comments)', async () => {
    const res = await request(`/tickets/${testTicketId}/comments`, 'POST', {
      message: 'I tried forgetting the Wi-Fi network and reconnecting, but the LDAP login still times out.',
      isInternal: false,
    }, userToken);

    if (res.status !== 201 || !res.body.comment) {
      throw new Error(`Failed to post comment (${res.status}): ${JSON.stringify(res.body)}`);
    }
  });

  // 10. New Feature 3: AI Solution & KB Recommendation Assistant
  await test('13. AI Solution Assistant & FAQ Recommendation (/api/tickets/:id/ai-solution)', async () => {
    const res = await request(`/tickets/${testTicketId}/ai-solution`, 'GET', null, staffToken);
    if (res.status !== 200 || !res.body.aiRecommendation) {
      throw new Error(`AI Solution Assistant failed (${res.status}): ${JSON.stringify(res.body)}`);
    }
  });

  // 11. New Feature 4: CSAT Ticket Feedback & Star Rating
  await test('14. CSAT Ticket Feedback & 5-Star Rating (/api/tickets/:id/feedback)', async () => {
    const res = await request(`/tickets/${testTicketId}/feedback`, 'POST', {
      rating: 5,
      comment: 'Excellent and super fast IT support response!',
    }, userToken);

    if (res.status !== 200 || !res.body.feedback) {
      throw new Error(`CSAT Feedback submission failed (${res.status}): ${JSON.stringify(res.body)}`);
    }
  });

  console.log('');
  console.log('-----------------------------------------------------------');
  console.log(` 🏆 Test Results: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('-----------------------------------------------------------');
  console.log('');
}

runTestSuite().catch(console.error);
