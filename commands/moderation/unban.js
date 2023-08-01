/**
 * Lift a ban from a user.
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
        .setName('unban')
        .setDescription('Remove a ban from a user, allowing them to rejoin.')
        .addStringOption(user =>
            user.setName('user')
                .setDescription(`The banned user's ID.`)
                .setRequired(true))
        .addStringOption(reason =>
            reason.setName('reason')
                .setDescription('Reason for lifting the ban.')
                .setRequired(true)),

    async execute(interaction) {
        const userID = interaction.options.getString("user");
        const user = await interaction.client.users.fetch(userID);
        if (!user)
            return interaction.reply(`No user found with ID ${userID}.`);
        const reason = interaction.options.getString("reason");
        const modRole = await interaction.guild.roles.fetch(modID);
        if (!interaction.member.roles.cache.has(modID) && !interaction.user.id !== adminID && interaction.member.roles.highest.position < modRole.position) {
            interaction.client.emit("unauthorized", interaction.client, interaction.user, {
                command: "unban",
                details: ""
            });
            return interaction.reply("You are not authorized to perform this command. Repeated attempts to perform unauthorized actions may result in a ban.");
        }
        // Log this
        await sequelize.transaction(() => {
            return ModLogs.create({
                loggedID: user.id,
                loggerID: interaction.user.id,
                logName: "unban",
                message: reason
            })
        }).catch(err => {
            // Error. Log it and tell the mod it failed.
            console.log(err);
            return interaction.channel.send(`There was an error logging to database. Please inform the bot administrator.`);
        });

        interaction.guild.members.unban(user, reason)
            .then(async () => {
                // Unban successful
                const message = `Your ban in ${interaction.guild.name} has been lifted by a moderator. The reason provided is as follows:` +
                    `\n${reason}` +
                    `\nYou may now rejoin the server if you like. Please read the rules carefully to avoid any further incidents.`
                user.send({
                    content: message
                })
                    .catch(async err => {
                        // Failed to message the user
                        console.log(err);
                        const guild = await interaction.client.guilds.fetch(guildID);
                        const channel = await guild.channels.fetch(logChannel);
                        const response = new EmbedBuilder()
                            .setColor(messageColors.error)
                            .setTitle("Message Failed")
                            .setDescription(`Sending unban message to user ${user.username} failed. This is likely a result of their privacy settings.`)
                            .setTimestamp();

                        channel.send({embeds: [response]});
                    })
                const channel = await interaction.client.channels.fetch(logChannel);
                const response = new EmbedBuilder()
                    .setColor(messageColors.memUnban)
                    .setTitle("Member unbanned")
                    .setDescription(`User ${user.username} has been unbanned from the server by @${interaction.user.username}.`)
                    .addFields([{name: "Reason", value: reason}])
                    .setTimestamp();
                channel.send({embeds: [response]});
                return interaction.reply("Unban successful.");
            })
            .catch(async err => {
                // Unban failed
                console.log(err);
                const channel = await interaction.guild.channels.fetch(logChannel);
                const response = new EmbedBuilder()
                    .setColor(messageColors.error)
                    .setTitle("Error unbanning user")
                    .setDescription(`An error occurred while trying to unban ${user.username}. The error is displayed below.`)
                    .addFields([
                        {name: "Moderator", value: `${interaction.user.username}`},
                        {name: "Reason", value: reason}
                    ])
                    .setTimestamp();
                channel.send({embeds: [response]})
                return interaction.reply("Unban unsuccessful. Check the logs for more information.");
            });
    }
}