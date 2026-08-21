require('dotenv').config();
const { User } = require('../src/models/user');

async function verify() {
    try {
        console.log('Verifying User model...');
        const user = await User.findOne();
        if (user) {
            console.log('Successfully fetched a user:', JSON.stringify(user, null, 2));
        } else {
            console.log('User table is empty or query returned no results, but no error occurred.');
        }
        console.log('Verification successful.');
        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

verify();
