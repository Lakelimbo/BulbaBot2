/**
 * Remove a user from the server and prevent them from re-joining.
 */
const {SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const {
    database,
    dbhost,
    dbuser,
    dbpass,
    messageColors,
    modID,
    adminID,
    guildID,
    logChannel,
    clientID
} = require('../../config.json');
const Sequelize = require('sequelize');
const sequelize = new Sequelize(database, dbuser, dbpass, {
    host: dbhost,
    dialect: 'mysql',
    logging: false
});
const ModLogs = require('../../includes/sqlModLogs.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Remove a user from the server and prevent them from re-joining.')
        .addStringOption(reason =>
            reason.setName('reason')
                .setDescription('Reason for ban.')
                .setRequired(true))
        .addUserOption(user =>
            user.setName('user')
                .setDescription('The offending user (if they are present in the server)'))
        .addStringOption(userID =>
            userID.setName('userid')
                .setDescription("If a user is not present in server, you will need to enter their ID here")),


    async execute(interaction) {
        const reason = interaction.options.getString("reason");
        let user = interaction.options.getUser("user");
        console.log(user);
        if (!user)
            user = interaction.options.getString("userid");
        if (!user)
            return interaction.reply("You must provide either a user or their ID.");
        const member = await interaction.client.users.fetch(user);
        const isInServer = await interaction.guild.members.resolve(user);
        if (isInServer){
            const modRole = await interaction.guild.roles.fetch(modID);
            if (!interaction.member.roles.cache.has(modID) && !interaction.user.id !== adminID && interaction.member.roles.highest.position < modRole.position) {
                interaction.client.emit("unauthorized", interaction.client, interaction.user, {
                    command: "ban",
                    details: "User ${interaction.user.username} attempted to ban ${member.username}, giving the reason \"${reason}"
                });
                return interaction.reply("You are not authorized to perform this command. Repeated attempts to perform unauthorized actions may result in a ban.");
            }
            if (isInServer.roles.highest.position >= modRole.position) {
                interaction.client.emit("unauthorized", interaction.client, interaction.user, {
                    command: "ban",
                    details: `User ${interaction.user.username} attempted to ban ${member.username}, giving the reason "${reason}"`
                });
                return interaction.reply("The bot may not be used to perform moderation actions against other moderators or higher. This incident will be logged.");
            }
        }


        if (member.id === clientID)
            return interaction.reply("I can't remove myself from the server.");
        // Log the ban
        await sequelize.transaction(() => {
            return ModLogs.create({
                loggedID: member.id,
                loggerID: interaction.user.id,
                logName: "ban",
                message: reason
            })
        }).catch(err => {
            // Error. Log it and tell the mod it failed.
            console.log(err);
            return interaction.reply(`There was an error logging to database:\n${err}\nPlease inform the bot author.`);
        });

        const message = `You have been banned from ${interaction.guild.name} by a moderator. The reason provided is as follows:` +
            `\n${reason}` +
            `\nPlease be aware that harassment directed at any of the moderators may result in direct referral to Discord staff.`
        member.send({
            content: message
        })
            .then(() => {
                interaction.guild.members.ban(member, {reason: reason}).then(async () => {
                    const channel = await interaction.client.channels.fetch(logChannel);
                    const response = new EmbedBuilder()
                        .setColor(messageColors.memBan)
                        .setTitle("Member banned")
                        .setDescription(`Member @${member.username} has been banned from the server by @${interaction.user.username}.`)
                        .addFields([{name: "Reason", value: reason}])
                        .setTimestamp();
                    channel.send({embeds: [response]});
                    return interaction.reply("Ban successful.");
                })
                    .catch(async err => {
                        console.log(err);
                        const channel = await interaction.guild.channels.fetch(logChannel);
                        const response = new EmbedBuilder()
                            .setColor(messageColors.error)
                            .setTitle("Error banning user")
                            .setDescription(`An error occurred while trying to ban @${member.username}. The error is displayed below.`)
                            .addFields([{
                                name: "Moderator",
                                value: `@${interaction.user.username}`
                            },
                                {
                                    name: "Reason",
                                    value: reason
                                }
                            ])
                            .setTimestamp();
                        channel.send({embeds: [response]})
                        return interaction.reply("Ban unsuccessful. Check the logs for more information.");
                    });
            })
            .catch(async err => {
                console.log(err);
                const guild = await interaction.client.guilds.fetch(guildID);
                const channel = await guild.channels.fetch(logChannel);
                const response = new EmbedBuilder()
                    .setColor(messageColors.error)
                    .setTitle("Message Failed")
                    .setDescription(`Sending ban message to user @${member.username} failed. This is likely a result of their privacy settings.`)
                    .setTimestamp();

                channel.send({embeds: [response]});
                interaction.guild.members.ban(member, {reason: reason}).then(async () => {
                    const response = new EmbedBuilder()
                        .setColor(messageColors.memBan)
                        .setTitle("Member banned")
                        .setDescription(`Member @${member.username} has been removed from the server by @${interaction.user.username}.`)
                        .addFields([{name: "Reason", value: reason}])
                        .setTimestamp();
                    channel.send({embeds: [response]});
                    return interaction.reply("Ban successful.");
                })
                    .catch(async err => {
                        console.log(err);
                        const response = new EmbedBuilder()
                            .setColor(messageColors.error)
                            .setTitle("Error banning user")
                            .setDescription(`An error occurred while trying to ban @${member.username}. The error is displayed below.`)
                            .addFields({name: "Error", value: err}, {
                                name: "Moderator",
                                value: `@${interaction.user.username}`
                            })
                            .setTimestamp();
                        channel.send({embeds: [response]});
                        return interaction.reply("Ban unsuccessful. Check the logs for more information.");
                    });
            });

    }
}