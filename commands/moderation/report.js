/*
 * Report a user for poor behavior
 */

const {SlashCommandBuilder, EmbedBuilder, userMention} = require("discord.js");
const {database, dbuser, dbpass, dbhost, reportChannel} = require('../../config.json');
const Sequelize = require('sequelize');
const sequelize = new Sequelize(database, dbuser, dbpass, {
    host: dbhost,
    dialect: 'mysql',
    logging: false
});
const ReportLogs = require('../../includes/sqlReportLogs.js');
module.exports = {
    data: new SlashCommandBuilder()
        .setName("report")
        .setDescription("Report a user for poor or offensive behavior.")
        .addUserOption(user =>
            user.setName("user")
                .setDescription("The offending user.")
                .setRequired(true))
        .addStringOption(reason =>
        reason.setName("reason")
            .setDescription("How the user in question is breaking the rules.")
            .setRequired(true)),
    async execute(interaction) {
        const reportedUser = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason");
        const reportsChannel = await interaction.guild.channels.fetch(reportChannel);
        const reportingUser = interaction.user;

        return sequelize.transaction(() => {
            return ReportLogs.create({
                reportedID: reportedUser.id,
                reporterID: reportingUser.id,
                message: reason
            }).catch(err => console.log(err));
        }).then(() => {
            const response = new EmbedBuilder()
                .setTitle("New Report")
                .setDescription(`Report made against user ${reportedUser.username}`)
                .setThumbnail(reportedUser.avatarURL())
                .addFields({ name: "User (ID)", value: `${userMention(reportedUser)} (${reportedUser.id})`},
                    {name: "Message", value: reason})
                .setTimestamp();
            reportsChannel.send({embeds: [response]});
            interaction.reply({content: "Your report has been submitted for review.", ephemeral: true})
        })
            .catch(err => {
                console.log(err);
                const response = new EmbedBuilder()
                    .setTitle("New Report")
                    .setDescription(`Report made against user ${reportedUser.username}`)
                    .setThumbnail(reportedUser.avatarURL())
                    .addFields({ name: "User (ID)", value: `${userMention(reportedUser.id)} (${reportedUser.id})`},
                        {name: "Message", value: reason},
                        {name: "Warning!", value: "This report was not logged to the database due to an error. Please contact the bot's administrator."})
                    .setTimestamp();
                reportsChannel.send({embeds: [response]});
                interaction.reply({content: "Your report has been submitted for review.", ephemeral: true});
            });
    }
};