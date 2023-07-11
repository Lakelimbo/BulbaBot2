/**
 * Event handler for logging when a user leaves the server.
 */
const {Events, EmbedBuilder} = require('discord.js');
const {logChannel, messageColors} = require('../config.json');
const ModLogs = require('../includes/sqlModLogs.js');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        // Wait a few seconds so any kicks or bans can get logged and caught by our check
        setTimeout(this.checkRemoved, 2000, member)
    },
    async checkRemoved(member){
        const logsChannel = await member.guild.channels.fetch(logChannel);
        ModLogs.findAll({
            where: {
                loggedID: member.id,
                [Op.or]: [
                    {logName: "ban"},
                    {logName: "kick"}
                ],
                logTime: {
                    [Op.gte]: Sequelize.literal("DATE_SUB(NOW(), INTERVAL 1 MINUTE)")
                }
            }
        }).then(result => {
            if (!result.length) {
                const response = new EmbedBuilder()
                    .setColor(messageColors.memLeave)
                    .setTitle("Member Left")
                    .setThumbnail(member.user.displayAvatarURL())
                    .setDescription("<@!" + member.id + "> (" + member.user.username + ")")
                    .setFooter({text: `ID:  ${member.id}`})
                    .setTimestamp();
                logsChannel.send({embeds: [response]}).catch(err => console.log(err));
            }
        }).catch(err => {
            console.log(err);

        });
    }
}