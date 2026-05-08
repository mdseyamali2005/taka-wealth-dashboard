import http from 'http';

const req = http.request(
  {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  },
  (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => console.log(res.statusCode, data));
  }
);

req.on('error', (e) => console.error(e));

req.write(JSON.stringify({ email: 'sufia4010@gmail.com', password: 'wrong' }));
req.end();
