const axios = require('axios');
require('dotenv').config();

async function testUpdate() {
    const token = 'ADMIN_TOKEN_HERE'; // I need a valid token.
    // Actually, I can use my knowledge of the password to login first.

    try {
        console.log('Logging in...');
        const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
            nip: 'admin',
            password: 'admin'
        });
        const { token } = loginRes.data;
        console.log('Logged in successfully.');

        console.log('Sending update request...');
        const res = await axios.put('http://localhost:3000/api/settings', {
            site_name: 'TEST SITE',
            org_name_1: 'TEST ORG 1',
            org_name_2: 'TEST ORG 2'
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log('Response:', res.data);

        console.log('Verifying update...');
        const verifyRes = await axios.get('http://localhost:3000/api/settings');
        console.log('Current Settings:', verifyRes.data);

    } catch (err) {
        console.error('Test Error:', err.response?.data || err.message);
    }
}

testUpdate();
