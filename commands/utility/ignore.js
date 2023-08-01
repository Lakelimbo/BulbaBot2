/**
 * Log a warning for a user.
 */
const {SlashCommandBuilder} = require('discord.js');
const {ignores} = require('../../config.json');

let choices = [];
for (const property in ignores){
    choices.push({name: property, value: ignores[property]});
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ignore')
        .setDescription('Allows you to ignore a channel. Use again to stop ignoring the channel.')
        .addStringOption(group =>
            group.setName("group")
                .setDescription("The channel you'd like to ignore (or unignore).")
                .setRequired(true)),
    async execute(interaction) {
        const group = interaction.options.getString("group");
        if (!ignores[group])
            return interaction.reply({content: `${group} is not a valid channel to ignore.`});
        const user = interaction.member;
        if (!user.roles.cache.get(ignores[group]))
            return this.addIgnore(user, group, interaction);
        else return this.removeIgnore(user, group, interaction);
    },

    addIgnore(user, group, interaction) {
        user.roles.add(ignores[group]).then(() => {
            return interaction.reply({content: `You are now ignoring ${group}`});
        }).catch(err => {
            console.log(err);
            interaction.reply("Oops! Something went wrong. Please let a moderator know so we can fix this!");
        })
    },

    removeIgnore(user, group, interaction){
        user.roles.remove(ignores[group]).then(() => {
            return interaction.reply({content: `You are no longer ignoring ${group}.`});
        }).catch(err => {
            console.log(err);
            interaction.reply("Oops! Something went wrong. Please let a moderator know so we can fix this!");
        })
    }
}