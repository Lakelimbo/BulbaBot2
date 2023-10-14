/*
 * Mute a user.
 */

const {database, dbhost, dbuser, dbpass, modID, logChannel, muteID, messageColors} = require('../../config.json');
const Sequelize = require('sequelize');
const sequelize = new Sequelize(database, dbuser, dbpass, {
    host: dbhost,
    dialect: 'mysql',
    logging: false
});

const ModLogs = require('../../includes/sqlModLogs.js');
const Mutes = require('../../includes/sqlMutes.js');
const {SlashCommandBuilder, EmbedBuilder} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Prevent a user from typing in text channels for a set period of time.')
        .addUserOption(user =>
            user.setName('user')
                .setDescription('The offending user.')
                .setRequired(true))
        .addStringOption(reason =>
            reason.setName('reason')
                .setDescription('Reason for mute.')
                .setRequired(true))
        .addStringOption(duration =>
            duration.setName('duration')
                .setDescription("Duration for the mute. Accepts days (d), hours (h), or minutes (m).")
                .setRequired(true)),
    async execute(interaction) {
        const modRole = await interaction.guild.roles.fetch(modID);
        const logsChannel = await interaction.guild.channels.fetch(logChannel);
        const user = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason");
        // Not a mod; cannot use this command
        if (interaction.member.roles.highest.position < modRole.position) {
            interaction.client.emit("unauthorized", interaction.client, interaction.user, {
                command: "mute",
                details: `${interaction.user.username} attempted to mute user #${user.username} with reason ${reason}`
            });
            return interaction.reply("You are not authorized to perform this command. Repeated attempts to perform unauthorized actions may result in a ban.");
        }
        const member = await interaction.guild.members.fetch(user).catch(err => console.log(err));
        // Target is a mod. Abort.
        if (member.roles.highest.position >= modRole.position) {
            interaction.client.emit("unauthorized", interaction.client, interaction.user, {
                command: "mute",
                details: `User ${interaction.user.username} attempted to mute ${user.username}, giving the reason "${reason}"`
            });
            return interaction.reply("The bot may not be used to perform moderation actions against other moderators or higher. This incident will be logged.");
        }
        if (member.roles.cache.has(muteID))
            return interaction.reply({content: `This user is already muted. (User: ${member.user.username})`});
        // Parse user input
        const userDuration = interaction.options.getString("duration");
        let duration = this.getDuration(userDuration);
        if (!duration)
            return interaction.reply({
                content: "Your format for the duration is not correct. You can specify days (d), hours (h), or minutes(m).",
            });
        const interval = duration[1];
        duration = duration[0];

        const muted = await Mutes.findOne({where: {mutedID: user.id}});
        // User doesn't have the muted role, but there's a mute in the database already. Delete it to make room for the new one.
        if (muted)
            await Mutes.destroy({where: {mutedID: user.id}});

        await member.roles.add(muteID, reason).catch(err => {
            console.log(err);
            return interaction.reply({content: "There was an error while attempting the mute. Please inform the bot's administrator."});
        });

        // Stage the unmute
        setTimeout(() => {
            interaction.client.emit("unmute", interaction.client, user.id, false);
        }, duration);


        return sequelize.transaction(() => {
            return ModLogs.create({
                loggedID: user.id,
                loggerID: interaction.user.id,
                logName: "mute:" + userDuration,
                message: reason
            })
                .then(() => {
                    return Mutes.create({
                        mutedID: user.id,
                        mutedName: user.username,
                        duration: userDuration,
                        unmutedTime: Sequelize.literal("DATE_ADD(NOW()," + interval + ")")
                    }).catch(err => console.log(err));
                }).catch(err => console.log(err));
            // Transaction has been rolled back
            // err is whatever rejected the promise chain returned to the transaction callback
        })
            .then(() => {
                console.log("Transaction success.");
                // Transaction was successfully committed. Everything is A-OK.
                user.send({
                    content: `You have been muted by a moderator in ${interaction.guild.name} for ${userDuration}.`
                        + ` The reason for your mute is as follows:\n${reason}\nYour mute will expire automatically after the duration has ended.`
                        + ` Please take this time to review the server rules to prevent further action against your account. Harassment of any kind toward`
                        + ` moderators may result in referral to Discord staff.\nIf your mute is not automatically lifted after the expiration, you`
                        + ` may message a moderator and request it to be manually removed.`
                }).catch(err => {
                    console.log(err);
                    const response = new EmbedBuilder()
                        .setColor(messageColors.error)
                        .setTitle("Message Failed")
                        .setDescription(`Sending mute message to user @${user.username} failed. This is likely a result of their privacy settings.`)
                        .setTimestamp();
                    logsChannel.send({embeds: [response]});
                });
                const response = new EmbedBuilder()
                    .setColor(messageColors.memMute)
                    .setTitle("User Muted")
                    .setDescription(`User ${user.username} has been muted for ${userDuration}.`)
                    .setTimestamp();
                logsChannel.send({embeds: [response]});
                return interaction.reply({embeds: [response]});
            })
            .catch(err => {
                console.log(err);
                user.send({
                    content: `You have been muted by a moderator in ${interaction.guild.name} for ${duration}.`
                        + ` The reason for your mute is as follows:\n${reason}\nYour mute will expire automatically after the duration has ended.`
                        + ` Please take this time to review the server rules to prevent further action against your account. Harassment of any kind toward`
                        + ` moderators may result in referral to Discord staff.\nIf your mute is not automatically lifted after the expiration, you`
                        + ` may message a moderator and request it to be manually removed.`
                }).catch(err => {
                    console.log(err);
                    const response = new EmbedBuilder()
                        .setColor(messageColors.error)
                        .setTitle("Message Failed")
                        .setDescription(`Sending mute message to user @${user.username} failed. This is likely a result of their privacy settings.`)
                        .setTimestamp();
                    logsChannel.send({embeds: [response]});
                });
                const response = new EmbedBuilder()
                    .setColor(messageColors.memMute)
                    .setTitle("User Muted")
                    .setDescription(`User ${user.username} has been muted for ${userDuration}.`)
                    .setTimestamp();
                return interaction.reply({content: "User successfully muted, but there was a problem logging to the database. Please inform the bot's administrator.", embeds: [response]})
            });
    },
    /**
     * Process user input to create proper time measurements
     * @param arg
     * @returns {boolean|(number|string)[]}
     */
    getDuration(arg) {
        const measure = arg.trim().toLowerCase().slice(-1);
        const time = parseInt(arg, 10);
        let duration = 1;
        let interval = "INTERVAL " + time.toString();
        switch (measure) {
            case ("d"):
                interval += " DAY";
                duration = time * 24 * 60 * 60; // d*h*m*s
                break;
            case ("h"):
                interval += " HOUR";
                duration = time * 60 * 60;  // h*m*s
                break;
            case ("m"):
                interval += " MINUTE";
                duration = time * 60; // m*s
                break;
            default:
                return false; // Don't recognize the format
        }
        return [duration * 1000, interval];
    }
}