/**
 * Tells the bot to unmute a user. Works alongside task scheduler,
 * and is invoked upon discovering any stalled unmutes on restart.
 */
const {muteID, guildID, logChannel, messageColors} = require("../config.json");
const {Events, EmbedBuilder} = require("discord.js");
const Mutes = require('../includes/sqlMutes.js');
const schedule = require("node-schedule");

Events.Unmute = "unmute";

module.exports = {
    name: Events.Unmute,
    async execute(client, mutes, fromStartup) {
        const guild = await client.guilds.fetch(guildID);
        const logsChannel = await guild.channels.fetch(logChannel);
        // mutes is an array passed by the startup event here
        if (fromStartup) {
            let pending = [], unmutes = [];
            for (const mute of mutes) {
                const member = await guild.members.fetch(mute.getDataValue("mutedID")).catch(err => {
                    console.log(err);
                });
                if (!member)
                    return;
                const timeToUnmute = new Date(mute.getDataValue("unmutedTime")).getTime();
                const now = new Date().getTime();
                const duration = timeToUnmute - now;
                if (duration <= 0) {
                    member.roles.remove(muteID).catch(err => {
                        console.log(err);
                    });
                    await Mutes.destroy({where: {mutedID: member.user.id}});
                    unmutes.push({
                        name: mute.getDataValue("mutedName"),
                        value: `Mute expired at ${mute.getDataValue("unmutedTime")}.`,
                        inline: true
                    });
                } else {
                    pending.push({
                        name: mute.getDataValue("mutedName"),
                        value: "Muted for " + mute.getDataValue("duration") + " at " + mute.getDataValue("mutedTime") + ".\n"
                            + "Unmute scheduled at " + mute.getDataValue("unmutedTime") + ".",
                        inline: true
                    });
                    const time = new Date(timeToUnmute);
                    console.log(timeToUnmute);
                    const job = await schedule.scheduleJob({start: time}, () => {
                        client.emit("unmute", client, member.user.id, false);
                        schedule.cancelJob(job);
                    });
                }
            }
            if (unmutes.length) {
                const doneUnmutes = new EmbedBuilder()
                    .setTitle("Users Unmuted")
                    .setDescription("The following users have expired mutes that were not properly lifted. They have been automatically unmuted.")
                    .addFields(unmutes)
                    .setTimestamp();
                logsChannel.send({embeds: [doneUnmutes]}).catch(err => {
                    console.log(err);
                });
            }
            if (pending.length) {
                const pendingUnmutes = new EmbedBuilder()
                    .setTitle("Pending unmutes")
                    .setDescription("The following users are still muted. Information about their mutes follows.")
                    .addFields(pending)
                    .setTimestamp();
                logsChannel.send({embeds: [pendingUnmutes]}).catch(err => {
                    console.log(err);
                });
            }
        }
        else {
            // mutes in this case should just be a single ID
            const member = await guild.members.fetch(mutes);
            if (!member.roles.cache.has(muteID))
                return;
            member.roles.remove(muteID)
                .then(() => {
                    Mutes.destroy({where: {mutedID: member.user.id}})
                        .catch(err => {
                            console.log(err);
                            const alert = new EmbedBuilder()
                                .setColor(messageColors.error)
                                .setTitle("Database error")
                                .setDescription(`There was an error removing the mute for ${user.username} from the database. Please inform the bot's administrator.`)
                                .setTimestamp();
                            logsChannel.send({embeds: [alert]});
                        })
                    const response = new EmbedBuilder()
                        .setColor(messageColors.memUnmute)
                        .setTitle("Mute expired")
                        .setDescription(`Member ${member.user.username} has had their mute expire. The role has been removed successfully.`)
                        .setTimestamp();
                    logsChannel.send({embeds: [response]});
                    member.user.send({content: `Your mute in ${guild.name} has expired.`});
                })
                .catch(err => {
                    console.log(err);
                    const alert = new EmbedBuilder()
                        .setColor(messageColors.error)
                        .setTitle("Unmute failure")
                        .setDescription(`Unmute of ${member.user.username} failed. Please inform the bot's administrator.`)
                        .setTimestamp();
                    logsChannel.send({embeds: [alert]});
                })
        }
    }
}