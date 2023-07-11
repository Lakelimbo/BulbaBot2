/**
 * Custom event handler for when a user attempts to use a command they are not
 * authorized for.
 */
const {Events, EmbedBuilder} = require('discord.js');
const {logChannel, guildID, messageColors} = require('../config.json');
Events.Unauthorized = "unauthorized";

module.exports = {
    name: Events.Unauthorized,
    async execute(client, user, data) {
        // Our guild info cannot be passed to this event, so fetch it from client
        const guild = await client.guilds.fetch(guildID);
        const member = await client.users.fetch(user);
        const logsChannel = await guild.channels.fetch(logChannel);
        const command = data.command;

        const response = new EmbedBuilder()
            .setColor(messageColors.misuseWarn)
            .setTitle("Unauthorized User")
            .setDescription(`Attempted use of ${command} by <@!${member.username}>`)
            .addFields([{name: "Details", value: `${data.details}`}])
            .setTimestamp();

        logsChannel.send({embeds: [response]}).catch(err => console.log(err));
    },
};
