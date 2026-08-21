const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    logging: console.log,
});

async function addNameColumn() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        const [results] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'name';");

        if (results.length === 0) {
            console.log('Adding name column...');
            await sequelize.query("ALTER TABLE users ADD COLUMN name VARCHAR(255);");
            console.log('Name column added successfully.');
        } else {
            console.log('Name column already exists.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sequelize.close();
    }
}

addNameColumn();
