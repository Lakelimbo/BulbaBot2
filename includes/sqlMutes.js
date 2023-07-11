/*
 * Contains the sequelize class for the mutes table.
 * This table is referenced on restart to requeue any unmutes that were pending.
 */


const Sequelize = require('sequelize');
const config = require('../config.json');
const sequelize = new Sequelize(config.database, config.dbuser, config.dbpass, {
    host: config.dbhost,
    dialect: "mysql",
    logging: false
});

const Model = Sequelize.Model;
class Mutes extends Model {}
Mutes.init({
    id: {
        type: Sequelize.BIGINT(20),
        unique: true,
        primaryKey: true,
        autoIncrement: true
    },
    mutedID: {
        type: Sequelize.BIGINT(20),
        allowNull: false
    },
    mutedName: {
        type: Sequelize.TEXT,
        allowNull: false
    },
    duration: {
        type: Sequelize.TEXT,
        allowNull: false
    },
    mutedTime: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        allowNull: false
    },
    unmutedTime: {
        type: Sequelize.DATE,
        allowNull: false
    }
}, {
    sequelize,
    modelName: 'mutes',
    // Sequelize will pluralize table names by default
    // For consistency, we stop this behavior
    freezeTableName: true,
    // If this is set to true (default),
    // Sequelize will create columns for time created, time updated, etc.
    // We store the log time already, so this is set to false.
    timestamps: false
});

Mutes.sync();

module.exports = Mutes;