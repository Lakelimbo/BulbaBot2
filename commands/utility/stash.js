/**
 * Archive a channel.
 */
const {SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const {modID, archiveID, logChannel, messageColors} = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stash')
        .setDescription('Archives a channel.')
        .addChannelOption(channel =>
            channel.setName('channel')
                .setDescription('The channel to archive.')
                .setRequired(true)),
    async execute(interaction) {
        const modRole = await interaction.guild.roles.fetch(modID);
        const target = interaction.options.getChannel("channel");
        if (interaction.member.roles.highest.position < modRole.position){
            interaction.client.emit("unauthorized", interaction.client, interaction.user, {
                command: "stash",
                details: `${interaction.user.username} attempted to stash the channel #${target}`
            });
            return interaction.reply("You are not authorized to perform this command. Repeated attempts to perform unauthorized actions may result in a ban.");
        }
        if (target.parentId === archiveID)
            return interaction.reply({content: "Channel is already archived.", ephemeral: true});

        target.setParent(archiveID);
        const channel = await interaction.guild.channels.fetch(logChannel);
        const response = new EmbedBuilder()
            .setColor(messageColors.success)
            .setTitle("Stash successful")
            .setDescription(`Channel ${target.name} successfully archived by ${interaction.user.username}.`)
            .setTimestamp();
        channel.send({embeds: [response]});
        interaction.reply(`Channel ${target.name} successfully archived.`);
    }
}