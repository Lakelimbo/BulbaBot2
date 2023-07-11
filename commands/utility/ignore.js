/**
 * Log a warning for a user.
 */
const {SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const {messageColors, ignores} = require('../../config.json');

let choices = [];
for (const property in ignores){
    choices.push({name: property, value: ignores[property]});
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ignore')
        .setDescription('Allows you to ignore a channel.')
        .addStringOption(group =>
            group.setName("group")
                .setDescription("The channel you'd like to ignore.")
                .setRequired(true)),
    async execute(interaction) {
        const group = interaction.options.getString("group");

    }
}