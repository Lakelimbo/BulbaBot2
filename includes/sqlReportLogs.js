/*
 * Contains the sequelize class for the reports table.
 */

const Sequelize = require('sequelize');
const config = require('../config.json');
const sequelize = new Sequelize(config.database, config.dbuser, config.dbpass, {
    host: config.dbhost,
    dialect: "mysql",
    logging: false
});

const Model = Sequelize.Model;
class ReportLogs extends Model {}
ReportLogs.init({
    id: {
        type: Sequelize.BIGINT(20),
        unique: true,
        primaryKey: true,
        autoIncrement: true
    },
    reporterID: {
        type: Sequelize.BIGINT(20),
        allowNull: false
    },
    reportedID: {
        type: Sequelize.BIGINT(20),
        allowNull: false
    },
    message: {
        type: Sequelize.TEXT,
        allowNull: false
    },
    time: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
    }
}, {
    sequelize,
    modelName: 'reportlogs',
    // Sequelize will pluralize table names by default
    // For consistency, we stop this behavior
    freezeTableName: true,
    // If this is set to true (default),
    // Sequelize will create columns for time created, time updated, etc.
    timestamps: false
});

// Ensure our DB is ready.
ReportLogs.sync().catch(err => {
    console.log(err);
});

module.exports = ReportLogs;