/**
 * Script for deploying commands, so they can be registered to Discord.
 * Commands should only be deployed globally once all testing is completed.
 */
const {REST, Routes} = require('discord.js');
//
const {clientID, guildID, token} = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
// All commands should be placed in appropriate directories under the ./commands directory
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);
for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(`./commands/${folder}/${file}`);
        commands.push(command.data.toJSON());
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST({version: '10'}).setToken(token);

// Perform the actual deployment
(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
            Routes.applicationGuildCommands(clientID, guildID),
            {body: commands},
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();
