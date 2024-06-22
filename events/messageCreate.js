/**
 * This handler fires whenever any message is sent.
 * It is used to check message contents, as well as enforce filters.
 */
const {Events, EmbedBuilder} = require('discord.js');
const {guildID, logChannel, messageColors, noInvites, modID} = require('../config.json');
const Blacklist = require("../includes/sqlBlacklist.js");
const ModLogs = require("../includes/sqlModLogs.js");
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.guild.id !== guildID || !message.member)
            return;

        // Link to wiki when using [[...]]
        const linkRegex = /\[\[(.*?)\]\]/;
        if (linkRegex.test(message.content.toLowerCase())) {
            const match = message.content.match(linkRegex);
            const searchText = match[1];
            return message.reply(`https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(searchText)}`);
        }

        //Disable invites
        const logsChannel = message.guild.channels.resolve(logChannel)
        const modRole = await message.guild.roles.fetch(modID);
        // Mods and up are exempt from this restriction
        const member = await message.guild.members.fetch(message.author);
        if (noInvites && message.content.toLowerCase().includes("discord.gg") && member.roles.highest.position < modRole.position) {
            try {
                await message.delete();
            } catch (err) {
                console.log(err);
                const response = new EmbedBuilder()
                    .setColor(messageColors.error)
                    .setTitle("Failed to delete Discord link")
                    .setDescription(`I was unable to remove message ${message.url}, in which I detected a Discord Link.`)
                    .addFields([
                        {
                            name: "Message",
                            value: message.content
                        },
                        {
                            name: "User",
                            value: message.author
                        }
                    ])
                    .setTimestamp();
                return logsChannel.send({embeds: [response]});
            }
            const response = new EmbedBuilder()
                .setColor(messageColors.messageDelete)
                .setTitle("Discord link removed")
                .setDescription("Message with Discord invite link removed.")
                .addFields([
                    {
                        name: "Message",
                        value: message.content.toString()
                    },
                    {
                        name: "User",
                        value: message.author.toString()
                    }])
                .setTimestamp();
            return logsChannel.send({embeds: [response]});

        }
        return this.filterMessage(message);
        
    },

    async filterMessage(message) {
        const filters = await Blacklist.findAll();
        if (!filters) return false; // No filters in place
        let actions = [];
        filters.forEach(filter => {
            let text = message.content;
            let flags = filter.getDataValue("flags");
            if (flags)
                flags = flags.split(","); // ["a", "s", "d", ...]
            let options = filter.getDataValue("options");
            if (options)
                options = options.split(",");// ["minimumaccountage:3d", "warntime:5d", ...]
            let term = filter.getDataValue("term");
            if (flags.indexOf("n") !== -1) {
                // Remove the flag from the list so we can iterate over actions later
                flags.splice(flags.indexOf("n"), 1);
                const accountAge = message.author.createdAt;
                const serverTime = message.member.joinedAt;
                if (!typeof(options.filter) !== "function")
                    return;
                let minimumAccountAge = options.filter(option => option.startsWith("minimumaccountage"));
                if (minimumAccountAge.length) {
                    const time = minimumAccountAge[0].split(":");
                    const duration = this.getDuration(time[1])[0];
                    if (Date.now() - accountAge < Date.now() - duration)
                        return; // Account is older than set age; Ignore this filter
                }
                let minimumServerTime = options.filter(option => option.startsWith("minimumservertime"));
                if (minimumServerTime.length) {
                    const time = minimumServerTime[0].split(":");
                    const duration = this.getDuration(time[1])[0];
                    if (Date.now() - serverTime < Date.now() - duration)
                        return; // Account has been in server long enough; Ignore filter
                }
            }
            if (flags.indexOf("i") === -1) { // Case insensitive by default
                flags.splice(flags.indexOf("i"), 1);
                term = term.toLowerCase();
                text = text.toLowerCase();
            }
            if (text.includes(term)) {
                let banned = false;
                let kicked = false;
                let warned = false;
                const filterID = filter.getDataValue("id");
                Array.from(flags).forEach(async flag => {
                    switch (flag) {
                        case "b":
                            actions.push("User was banned.");
                            banned = true;
                            await message.author.send({content: `You have been automatically banned from ${message.guild.name} for your message in ${message.channel.name}, which is as follows:\n` +
                            `${message.content}\nIf you believe you have been falsely banned, you may contact the moderators to request manual review. Please be aware that harassment directed toward` +
                            ` the moderation team may result in referral to Discord staff.\nPlease do not reply directly to this message; you will not receive a response.`});
                            message.guild.members.ban(message.author, {reason: "Banned automatically due to filter settings"}).then(() => {
                            }).catch(err => {
                                console.log(err);
                            });
                            break;
                        case "k":
                            kicked = true;
                            actions.push("User was kicked.");
                            await message.author.send({content: `You have been automatically kicked from ${message.guild.name} for your message in ${message.channel.name}, which is as follows:\n` +
                                    `${message.content}\nYou may rejoin the server, but you are encouraged to read the rules to prevent further action against your account.` +
                                `\nIf you believe this was done in error, you may contact the moderators to request manual review. Please be aware that harassment directed toward` +
                                    ` the moderation team may result in referral to Discord staff.\nPlease do not reply directly to this message; you will not receive a response.`});
                            message.guild.members.kick(message.author, "Kicked automatically due to filter settings").then(() => {
                            }).catch(err => {
                                console.log(err);
                            });
                            break;
                        case "w":
                            actions.push("Warning logged for user.")
                            warned = true;
                            flags.splice(flags.indexOf("w"), 1); // Remove from the list so softban knows what to do
                            await ModLogs.create({
                                loggedID: message.author.id,
                                loggerID: message.client.user.id,
                                logName: "filter" + filterID,
                                message: "Warning logged automatically via filter #" + filterID
                            }).then(async () => {
                                if (!banned && !kicked)
                                await message.author.send(`Your message in the server ${message.guild.name}, in the channel ${message.channel.name}, was flagged by our system as being inappropriate.` +
                                ` The message is as follows:\n${message.content}\n` +
                                `Please take the time to review the server rules to prevent further action being taken against your account.\n` +
                                `If you believe this was done in error, please contact the moderators for a manual review. Please be aware that harassment directed toward` +
                                    ` the moderation team may result in referral to Discord staff.\nPlease do not reply directly to this message; you will not receive a response.`);
                            }).catch(err => {
                                console.log(err);
                            });
                            break;
                        case "d":
                            actions.push("Message was deleted.");
                            message.delete().then(() => {
                                if (!banned && !warned && !kicked)
                                    message.author.send({content: `Your message in the server ${message.guild.name}, in the channel ${message.channel.name} has been identified as violating server rules and` +
                                            ` automatically deleted. The message was as follows:\n`
                                            + `${message.content}\nPlease review the server rules to prevent further action against your account.`});
                            }).catch(err => {
                                console.log(err);
                            });
                            break;
                        case "s":
                            let time = options.filter(option => option.startsWith("warntime"))[0].split(":")[1];
                            let interval = this.getDuration(time)[1];
                            const warnings = await ModLogs.count({
                                where: {
                                    loggerID: message.client.user.id,
                                    logTime: {[Op.gte]: Sequelize.literal("DATE_SUB(NOW(), " + interval + ")")},
                                    logName: "filter" + filterID
                                }
                            });
                            let threshold = 0;
                            if (flags.indexOf("w") !== -1)
                                threshold += 1;
                            threshold += parseInt(options.filter(option => option.startsWith("warnlimit"))[0].split(":")[1], 10);
                            if (warnings === threshold) {
                                actions.push("User was automatically banned due to an accumulation of warnings.")
                                await message.author.send({content: `You have been automatically banned from ${message.guild.name} for your message in ${message.channel.name}, which is as follows:\n` +
                                        `${message.content}\nThis is not the first recorded instance of you violating a specific rule, and our system has therefore banned you automatically.\n`
                                    + `If you believe you have been falsely banned, you may contact the moderators to request manual review. Please be aware that harassment directed toward` +
                                        ` the moderation team may result in referral to Discord staff.\nPlease do not reply directly to this message; you will not receive a response.`});
                                await message.guild.members.ban(message.author, {
                                    reason: "Banned automatically" +
                                        " due to an accumulation of automated warnings."
                                }).then(() => {
                                    banned = true;
                                }).catch(err => {
                                    console.log(err);
                                });
                            }
                            break;
                    }
                });
                const responseFields = [{
                    name: "Message",
                    value: message.content,
                },
                    {name: "The following actions have been taken:",
                    value: actions.join("\n") ? actions.join("\n") : "None"}]
                const response = new EmbedBuilder()
                    .setColor(messageColors.filter)
                    .setTitle(`Filter ID ${filterID} tripped`)
                    .setDescription(`User ${message.author.username} triggered filter #${filterID}`)
                    .addFields(responseFields)
                    .setTimestamp();
                const logsChannel = message.guild.channels.resolve(logChannel);
                logsChannel.send({embeds: [response]});
            }


        });
    },

    getDuration(arg) {
        const measure = arg.trim().toLowerCase().slice(-1);
        const time = parseInt(arg.trim().toLowerCase().slice(0, 1), 10);
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
            case ("s"): // Do nothing
                interval += " SECOND";
                duration = time;
                break;
            default:
                return false; // Don't recognize the format
        }
        return [duration * 1000, interval];
    }
}