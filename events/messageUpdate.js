/**
 * Event handler for logging edited messages.
 */
const {Events, EmbedBuilder} = require('discord.js');
const {logChannel, messageColors} = require('../config.json');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        // Creating an embed fires this event. This check prevents an error from crashing the bot and also prevents
        // logging messages with embeds.
        if (oldMessage.author.bot || newMessage.author.bot || oldMessage.content === newMessage.content || !oldMessage.guild || !newMessage.guild)
            return;
        // No idea what can cause this, but this should stop crashes.
        if (!newMessage.member) return console.log(`Strange behavior on message update. newMessage:\n${newMessage}\noldMessage:\n${oldMessage}`);
        const logsChannel = await oldMessage.guild.channels.fetch(logChannel);
        const response = new EmbedBuilder()
            .setColor(messageColors.messageEdit)
            .setTitle(`Message edited by ${newMessage.author.username}`)
            .setThumbnail(newMessage.author.avatarURL())
            .setDescription(`Message edited in ${oldMessage.channel.toString()}`)
            .addFields([
                {name: "Before:", value: oldMessage.content},
                {name: "After:", value: newMessage.content}
            ])
            .setFooter({text: `ID: ${newMessage.author.id}`})
            .setTimestamp();
        logsChannel.send({embeds: [response]});
    }
}