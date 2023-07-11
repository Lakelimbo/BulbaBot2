/**
 * Event handler for logging when a user joins the server.
 */
const {Events, EmbedBuilder} = require('discord.js');
const {logChannel, messageColors} = require('../config.json');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const logsChannel = await member.guild.channels.fetch(logChannel);
        const response = new EmbedBuilder()
            .setColor(messageColors.memJoin)
            .setTitle(`Member Joined`)
            .setThumbnail(member.user.displayAvatarURL())
            .setDescription("<@!" + member.id + "> (" + member.user.username + ")")
            .addFields([{name: 'Account created at: ', value: `${member.user.createdAt}`}])
            .setFooter({text: `ID: ${member.id}`})
            .setTimestamp();
        return logsChannel.send({embeds: [response]}).catch(err => console.log(err));
    }
}