const app = require('./index');
const sequelize = require('./models/db');

const port = process.env.PORT || 5001;

// Wait for all model syncs to complete before accepting requests
const { takeSnapshot } = require('./cron/snapshotJob');
const { seedCompanyData } = require('./controllers/companyController');

sequelize.authenticate()
  .then(() => sequelize.sync({ alter: true }))
  .then(() => seedCompanyData())
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
    takeSnapshot(); // take snapshot immediately on startup
  })
  .catch(err => {
    console.error('Failed to sync database:', err.message);
    process.exit(1);
  });
