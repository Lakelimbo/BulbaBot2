const {SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const {database, dbhost, dbuser, dbpass, messageColors, modID, logChannel} = require('../../config.json');
const Sequelize = require('sequelize');
const sequelize = new Sequelize(database, dbuser, dbpass, {
    host: dbhost,
    dialect: 'mysql',
    logging: false
});
const ModLogs = require('../../includes/sqlModLogs.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('modlogs')
        .setDescription('Check logged moderation actions taken against a user.')
        .addUserOption(user =>
            user.setName('user')
                .setDescription('The offending user.')
                .setRequired(true)),
    async execute(interaction) {
        const modRole = await interaction.guild.roles.fetch(modID);
        const user = interaction.options.getUser('user');
        if (interaction.member.roles.highest.position < modRole.position) {
            // Not authorized to perform this action; warn mods
            interaction.client.emit('unauthorized', interaction.client, interaction.user, {
                target: user,
                command: "modlogs"
            });
            return interaction.reply("You are not authorized to perform this command. Repeated attempts to perform unauthorized actions may result in a ban.");
        }

        const warnings = await ModLogs.findAll({
            where: {
                loggedID: user.id
            }
        }).catch(err => {
            console.log(err);
        });

        let fields = [];
        for (let i = 0; warnings[i]; i++) {
            const warning = warnings[i];
            const id = warning.getDataValue("loggerID").toString();
            const mod = await interaction.client.users.fetch(id);
            let modName = "";
            if (!mod)
                modName = "(deleted or deactivated account)"
            else modName = mod.username;
            const logType = warning.getDataValue("logName");
            let reason = "Reason: ";
            switch (logType) {
                case "ban":
                    reason += "**Member Banned**\nReason: ";
                    break;
                case "kick":
                    reason += "**Member Kicked**\nReason: ";
                    break;
                case "unban":
                    reason += "**Member Unbanned**\nReason: ";
                    break;
                case "unmute":
                    reason += "**Member Unmuted**\nReason: ";
                    break;
            }
            if (logType.includes("mute") && logType !== "unmute") {
                const duration = logType.split(":");
                reason += "**Member Muted** for " + duration[1] + "-\nReason: ";
            }
            fields.push({
                name: "Warning #" + (i + 1) + " - Warning ID: #" + warning.getDataValue("id"),
                value: "User:\n(" + user.id + ")\n" + user.username + "\n" + reason + warning.getDataValue("message") + "\nModerator:\n(" + id + ')\n' + modName + '\nTime: ' + warning.getDataValue("logTime"),
                inline: true
            });

        }
        const response = new EmbedBuilder()
            .setColor(messageColors.memLogs)
            .setTitle(`Warnings for ${user.username}`)
            .addFields(fields)
            .setTimestamp();
        return interaction.reply({embeds: [response]});
    }
}