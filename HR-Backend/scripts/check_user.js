require('dotenv').config();
const { User } = require('../src/models/user');
const bcrypt = require('bcryptjs');

async function checkUser() {
    try {
        const email = 'emp@gmail.com';
        const user = await User.findOne({ where: { email } });

        if (!user) {
            console.log(`User ${email} does not exist.`);

            // Option to create if missing
            console.log('Creating user...');
            const hashedPassword = await bcrypt.hash('emp', 10);
            const newUser = await User.create({
                name: 'Employee', // Default name
                email: email,
                password: hashedPassword,
                role: 'employee'
            });
            console.log('User created:', newUser.get({ plain: true }));

        } else {
            console.log(`User found:`, user.get({ plain: true }));

            // Verify password
            const isMatch = await bcrypt.compare('emp', user.password);
            console.log(`Password 'emp' match: ${isMatch}`);

            if (!isMatch) {
                console.log('Resetting password to "emp"...');
                const hashedPassword = await bcrypt.hash('emp', 10);
                user.password = hashedPassword;
                await user.save();
                console.log('Password reset successfully.');
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkUser();
