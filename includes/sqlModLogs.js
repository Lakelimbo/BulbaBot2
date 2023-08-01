/*
 * Contains the sequelize class for the moderation logs table.
 */

const Sequelize = require('sequelize');
const config = require('../config.json');
const sequelize = new Sequelize(config.database, config.dbuser, config.dbpass, {
    host: config.dbhost,
    dialect: "mysql",
    logging: false
});

const Model = Sequelize.Model;
class ModLogs extends Model {}
ModLogs.init({
    id: {
        type: Sequelize.BIGINT(20),
        unique: true,
        primaryKey: true,
        autoIncrement: true
    },
    loggedID: {
        type: Sequelize.BIGINT(20),
        allowNull: false
    },
    loggerID: {
        type: Sequelize.BIGINT(20),
        allowNull: false
    },/* Not functional yet
    loggedNick: {
        type: Sequelize.STRING,
        allowNull: false
    },
    loggedUsername: {
        type: Sequelize.STRING,
        allowNull: false
    },*/
    logName: {
        type: Sequelize.STRING,
        allowNull: false

    },
    message: {
        type: Sequelize.STRING,
        allowNull: false
    },
    logTime: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
}, {
    sequelize,
    modelName: 'modlogs',
    // Sequelize will pluralize table names by default
    // For consistency, we stop this behavior
    freezeTableName: true,
    // If this is set to true (default),
    // Sequelize will create columns for time created, time updated, etc.
    // We store the log time already, so this is set to false.
    timestamps: false
});

ModLogs.sync().catch(err => {
    console.log(err);
});

module.exports = ModLogs;