/*
 * Deletes a warning for a user.
 */
const {SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle} = require('discord.js');
const {dbhost, database, dbuser, dbpass, modID, messageColors, logChannel} = require('../../config.json');
const Sequelize = require('sequelize');
const sequelize = new Sequelize(database, dbuser, dbpass, {
    host: dbhost,
    dialect: 'mysql',
    logging: false
});
const ModLogs = require('../../includes/sqlModLogs.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearwarn')
        .setDescription('Remove a warning from a user.')
        .addIntegerOption(warning =>
            warning.setName('warning')
                .setDescription('The warning ID to remove.')
                .setRequired(true)),
    async execute(interaction) {
        const modRole = await interaction.guild.roles.fetch(modID);
        const warnID = interaction.options.getInteger("warning");
        if (interaction.member.roles.highest.position < modRole.position) {
            interaction.client.emit("unauthorized", interaction.client, interaction.user, {
                command: "clearwarn",
                details: `${interaction.user.username} attempted to clear warning ${warnID}`
            });
            return interaction.reply("You are not authorized to perform this command. Repeated attempts to perform unauthorized actions may result in a ban.");
        }
        const warning = await ModLogs.findOne({
            where: {
                id: warnID
            }
        }).catch(err => {
            console.log(err);
            interaction.reply("There was an error connecting to the database. Please notify the administrator.");
        });
        if (!warning) {
            return interaction.reply("No warning found with that ID.");
        }
        const user = await interaction.client.users.fetch(warning.getDataValue("loggedID").toString()).catch(err => {
            console.log(`Error fetching user; here's the loggedID:\n${warning.getDataValue('loggedID')}`);
            console.log(err);
            return interaction.reply("Unable to fetch users. This may indicate a bug,"
                + " or Discord's API may be down.");
        });
        const mod = await interaction.client.users.fetch(warning.getDataValue("loggerID").toString()).catch(err => {
            console.log(`Error fetching mod; here's the loggerID:\n${warning.getDataValue('loggerID')}`);
            console.log(err);
            return interaction.reply("Unable to fetch users. This may indicate a bug,"
                + " or Discord's API may be down.");
        });
        const type = warning.getDataValue("logName");
        const message = warning.getDataValue("message");

        // Build and send a message with confirmations
        const confirm = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("confirm")
                    .setLabel("Confirm")
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId("cancel")
                    .setLabel("Cancel")
                    .setStyle(ButtonStyle.Danger)
            );
        console.log(mod);
        const fields = [{name: "User", value: user.username, inline: true},
            {name: "Moderator", value: mod.username, inline: true},
            {name: "Warning type", value: type, inline: true},
            {name: "reason", value: message}];
        const information = new EmbedBuilder()
            .setTitle(`Warning ID#${warnID}`)
            .addFields(fields);
        interaction.reply({
            content: "Please confirm that you'd like to do this.",
            embeds: [information],
            components: [confirm],
            ephemeral: true
        });
        const filter = i => (i.customId === 'confirm' || i.customId === 'cancel') && interaction.user.id === i.user.id;
        const collector = interaction.channel.createMessageComponentCollector({filter, time: 15000});
        collector.on('collect', async i => {
            const confirmation = i.customId;
            if (confirmation === "cancel")
                return await i.update({content: "Cancelled; no action taken.", components: []});
            else if (confirmation === "confirm") {
                await i.update({content: "Confirmed. Deleting...", components: []});
                warning.destroy().then(async () => {
                    const response = new EmbedBuilder()
                        .setColor(messageColors.success)
                        .setTitle("Warning Deleted")
                        .addFields(fields)
                        .setDescription(`Warning ID#${warnID} deleted by ${interaction.user.username}.`)
                        .setTimestamp();
                    await i.followUp({content: "Warning deleted.", ephemeral: true});
                    const channel = await interaction.guild.channels.fetch(logChannel);
                    channel.send({embeds: [response]});
                }).catch(async err => {
                    console.log(err);
                    await i.followUp({content: "Failed to delete warning. Please inform the bot's administrator."});
                });
            } else
                await i.update({
                    content: "How did you actually manage to break this? Please tell the administrator what you did to trigger this message.",
                    components: []
                });
        });
    }
}