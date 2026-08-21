// Migration script to sync all Sequelize models with PostgreSQL
const sequelize = require('./employee').sequelize || require('./db');
const Employee = require('./employee');
const Spouse = require('./spouse');
const Kid = require('./kid');
const Document = require('./document');
const DashboardShortcut = require('./dashboard_shortcut');
const TrainingProgress = require('./training_progress');
const ActionItem = require('./action_item');
const Project = require('./project');
const EmployeeProject = require('./employee_project');

async function migrate() {
    try {
        await sequelize.sync({ alter: true });
        console.log('All models were synchronized successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
