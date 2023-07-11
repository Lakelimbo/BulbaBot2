/**
 * Event handler for logging bot start time.
 */
const {Events, Embed, EmbedBuilder} = require('discord.js');
const Mutes = require('../includes/sqlMutes.js');
const {guildID, muteID, logChannel} = require('../config.json');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        const guild = await client.guilds.fetch(guildID);
        const logsChannel = await guild.channels.fetch(logChannel);
        const date = new Date();
        console.log(`Bot started on ${date.getMonth()+1} ${date.getDate()}, ${date.getFullYear()} at ${date.getTime()} with username ${client.user.username}`);
        const mutes = await Mutes.findAll();
        if (mutes.length) {
            client.emit("unmute", client, mutes, true);
        }
        const restarted = new EmbedBuilder()
            .setTitle("Bot restarted")
            .setDescription("Bot has been restarted, either manually or automatically after a crash. Please inform the bot's administrator.")
            .setTimestamp();
        return logsChannel.send({embeds: [restarted]}).catch(err => {
            console.log(err);
        });
    },
};
