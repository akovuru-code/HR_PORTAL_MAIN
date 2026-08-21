require('dotenv').config();
const path = require('path');
const fs = require('fs');
const sequelize = require('../src/models/db');

// Import all model files so Sequelize registers them before sync
const modelsDir = path.join(__dirname, '..', 'src', 'models');
fs.readdirSync(modelsDir)
    .filter(file => file.endsWith('.js') && file !== 'db.js' && file !== 'migrate.js')
    .forEach(file => {
        console.log(`Loading model: ${file}`);
        require(path.join(modelsDir, file));
    });

async function run() {
    try {
        console.log('Starting DB sync (alter:true)');
        await sequelize.sync({ alter: true });
        console.log('DB sync completed');
        process.exit(0);
    } catch (err) {
        console.error('DB sync failed', err);
        process.exit(1);
    }
}

run();
