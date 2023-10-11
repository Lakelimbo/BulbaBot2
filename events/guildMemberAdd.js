/**
 * Event handler for logging when a user joins the server.
 */
const {Events, EmbedBuilder} = require('discord.js');
const {logChannel, messageColors, dbhost, database, dbuser, dbpass, muteID} = require('../config.json');
const Sequelize = require('sequelize');
const sequelize = new Sequelize(database, dbuser, dbpass, {
    host: dbhost,
    dialect: 'mysql',
    logging: false
});
const mutes = require('../includes/sqlMutes');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const logsChannel = await member.guild.channels.fetch(logChannel);
        const isMuted = await mutes.findOne({
            where: {
                mutedID: member.id
            }
        });
        if (isMuted !== null) {
            await member.roles.add(muteID, "Reapplied existing mute").then(() => {
                const response = new EmbedBuilder()
                    .setColor(messageColors.memJoin)
                    .setTitle('Muted Member Joined')
                    .setThumbnail(member.user.displayAvatarURL())
                    .setDescription("<@!" + member.id + "> (" + member.user.username + ")")
                    .addFields([{name: 'Account created at: ', value: `${member.user.createdAt}`},
                        {
                            name: "Mute details", value: "Muted at: " + isMuted.getDataValue("mutedTime") + "\n" +
                                "Mute duration: " + isMuted.getDataValue("duration") + "\n"
                                + "Unmute time: " + isMuted.getDataValue("unmutedTime")
                        }])
                    .setFooter({text: `ID: ${member.id}`})
                    .setTimestamp();
                return logsChannel.send({embeds: [response]}).catch(err => console.log(err));
            })
                .catch
                (err => {
                    console.log(err);
                });
        } else {
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
}