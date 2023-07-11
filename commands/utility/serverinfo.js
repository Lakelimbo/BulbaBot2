/*
 * Outputs general server information
 */

const {SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const {messageColors, modID} = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Get some general info about the server.'),
    async execute(interaction) {
        const modRole = await interaction.guild.roles.fetch(modID);
        if (interaction.member.roles.highest.position < modRole.position){
            interaction.client.event.emit("unauthorized", interaction.client, interaction.user, {
                command: "serverinfo",
                details: `${interaction.user.username} attempted to view server info.
                `
            });
            return interaction.reply("You are not authorized to perform this command. Repeated attempts to perform unauthorized actions may result in a ban.")
        }
        const members = interaction.guild.memberCount;
        const humans = interaction.guild.members.cache.filter(member => !member.user.bot).size;
        const bots = members - humans;
        let roles = [];
        interaction.guild.roles.cache.forEach(role => roles.push(role.name));
        roles = roles.join(", ").trim();
        let categories = [];
        interaction.guild.channels.cache.filter(channel => channel.type === 4).forEach(channel => categories.push(channel.name));
        categories = categories.join(", ").trim();
        console.log(categories);
        const owner = await interaction.guild.members.fetch(interaction.guild.ownerId);
        const response = new EmbedBuilder()
            .setColor(messageColors.whois)
            .setAuthor({name: interaction.guild.name, iconURL: interaction.guild.iconURL()})
            .addFields([
                {name: "Owner", value: owner.user.username, inline:true},
                {name: "Locale", value: interaction.guild.preferredLocale, inline:true},
                {name: "Text Channels", value: interaction.guild.channels.cache.filter(channel => channel.type === "text").size.toString(), inline:true},
                {name: "Voice Channels", value: interaction.guild.channels.cache.filter(channel => channel.type === "voice").size.toString(), inline:true},
                {name: "Members", value: members.toString(), inline:true},
                {name: "Humans", value: humans.toString(),inline:true},
                {name: "Bots", value: bots.toString(),inline:true},
                {name: "Amount of Roles", value: interaction.guild.roles.cache.size.toString(),inline:true},
                {name: "Amount of Categories", value: interaction.guild.channels.cache.filter(channel => channel.type === 4).size.toString(), inline:true},
                {name: "Roles", value: roles},
                {name: "Categories", value: categories}
            ])
            .setFooter({text: "ID: " + interaction.guild.id + "|Server Created • " + interaction.guild.createdAt});
        return interaction.reply({embeds: [response]});
    }
}