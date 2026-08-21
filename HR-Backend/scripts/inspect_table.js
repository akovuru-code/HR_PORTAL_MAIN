const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('postgresql://postgres:Chicago@1@localhost:5432/hr_db', {
    logging: false,
});

async function inspect() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');
        const [results] = await sequelize.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';");
        console.log('Columns in users table:', results.length);
        console.log(JSON.stringify(results, null, 2));

        const [resultsCapital] = await sequelize.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Users';");
        if (resultsCapital.length > 0) {
            console.log('Columns in Users table:', resultsCapital.length);
            console.log(JSON.stringify(resultsCapital, null, 2));
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sequelize.close();
    }
}

inspect();
