/*
 * Contains the sequelize class for the blacklist table.
 */


const Sequelize = require('sequelize');
const config = require('../config.json');
const sequelize = new Sequelize(config.database, config.dbuser, config.dbpass, {
    host: config.dbhost,
    dialect: "mysql",
    logging: false
});

const Model = Sequelize.Model;
class Blacklist extends Model {}
Blacklist.init({
    id: {
        type: Sequelize.BIGINT(20),
        unique: true,
        primaryKey: true,
        autoIncrement: true
    },

    term: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
    },

    flags: {
        type: Sequelize.STRING
    },

    options: {
        type: Sequelize.STRING
    },

    creator: {
        type: Sequelize.STRING,
        allowNull: false
    }

}, {
    sequelize,
    modelName: 'blacklist',
    // Sequelize will pluralize table names by default
    // For consistency, we stop this behavior
    freezeTableName: true,
    // If this is set to true (default),
    // Sequelize will create columns for time created, time updated, etc.
    // We store the log time already, so this is set to false.
    timestamps: false
});

Blacklist.sync();

module.exports = Blacklist;