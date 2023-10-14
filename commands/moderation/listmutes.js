/*
 * List active mutes in the database.
 */

const {modID, adminID, messageColors} = require('../../config.json');


const Mutes = require('../../includes/sqlMutes.js');
const {SlashCommandBuilder, EmbedBuilder} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listmutes')
        .setDescription('Get a list of current mutes that are stored in the database.'),
    async execute(interaction) {
        const modRole = await interaction.guild.roles.fetch(modID);
        if (!interaction.member.roles.cache.has(modID) && !interaction.user.id !== adminID && interaction.member.roles.highest.position < modRole.position) {
            interaction.client.emit("unauthorized", interaction.client, interaction.user, {
                command: "listmutes",
                details: `User ${interaction.user.username} attempted to view current mutes.`
            });
            return interaction.reply("You are not authorized to perform this command. Repeated attempts to perform unauthorized actions may result in a ban.");
        }
        const mutes = await Mutes.findAll().catch(err => {
            console.log(err);
            return interaction.reply("Something went wrong while attempting to retrieve current mutes. Please inform the bot's administrator.");
        });
        if (mutes.length === 0)
            return interaction.reply("There are no active mutes at this time.");
        let fields = [];
        for (const mute of mutes) {
            fields.push({
                name: `ID#${mute.getDataValue("id").toString()}`,
                value: `User ID: ${mute.getDataValue("mutedID")}\n` +
                    `Username: ${mute.getDataValue("mutedName")}\n` +
                    `Duration: ${mute.getDataValue("duration")}\n` +
                    `Mute time: ${mute.getDataValue("mutedTime")}\n` +
                    `Unmute time: ${mute.getDataValue("unmutedTime")}`,
                inline: true
            });
        }
        console.log(fields);
        const response = new EmbedBuilder()
            .setColor(messageColors.whois)
            .setTitle("Active Mutes")
            .setDescription("The following mutes are currently listed as active in the database.")
            .addFields(fields)
            .setTimestamp();
        return interaction.reply({embeds: [response]});
    }
}