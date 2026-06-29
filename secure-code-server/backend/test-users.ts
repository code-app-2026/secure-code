async function run() {
  try {
    const loginRes = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: '123'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.access_token;

    try {
      const usersRes = await fetch('http://localhost:3001/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await usersRes.json();
      console.log('Success:', data);
    } catch (err: any) {
      console.error('Users fetch failed:', err.message);
    }
  } catch (err: any) {
    console.error('Login failed:', err.message);
  }
}

run();
