/*
 * Filter system for the bot
 */
const {SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle} = require('discord.js');
const {modID, adminID, messageColors, logChannel} = require('../../config.json');
const Blacklist = require('../../includes/sqlBlacklist.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('filter')
        .setDescription("Access BulbaBot's blacklist settings")
        .addSubcommand(add =>
            add.setName("add")
                .setDescription("Add a filter to the blacklist")
                .addStringOption(term =>
                    term.setName("term")
                        .setDescription("The term to filter.")
                        .setRequired(true))
                .addStringOption(flags =>
                    flags.setName("flags")
                        .setDescription("Flags to set for the new filter. Refer to /filter help for a list of available flags and syntax.")
                        .setRequired(true))
                .addStringOption(options =>
                    options.setName("options")
                        .setDescription("Options for the new users and softban flags. Refer to /filter help for additional information.")))
        .addSubcommand(remove =>
            remove.setName("remove")
                .setDescription("Remove a filter.")
                .addStringOption(filter =>
                    filter.setName("filter")
                        .setDescription("The ID of the filter you wish to remove.")
                        .setRequired(true))
        )
        .addSubcommand(edit =>
        edit.setName("edit")
            .setDescription("Edit a filter by changing the term, flags, or options.")
            .addStringOption(filter =>
            filter.setName("filter")
                .setDescription("The ID of the filter you wish to edit.")
                .setRequired(true))
        .addStringOption(term =>
            term.setName("term")
                .setDescription("The term to filter."))
        .addStringOption(flags =>
            flags.setName("flags")
                .setDescription("Flags for the filter. Refer to /filter help for a list of available flags and syntax."))
        .addStringOption(options =>
            options.setName("options")
                .setDescription("Options for the new users and softban flags. Refer to /filter help for additional information.")))
        .addSubcommand(list =>
        list.setName("list")
            .setDescription("List all current filters."))
        .addSubcommand(help =>
        help.setName("help")
            .setDescription("Get help with the filter system.")),
    async execute(interaction) {
        const modRole = await interaction.guild.roles.fetch(modID);

        if (!interaction.member.roles.cache.has(modID) && !interaction.user.id !== adminID && interaction.member.roles.highest.position < modRole.position) {
            interaction.client.emit("unauthorized", interaction.client, interaction.user, {
                command: "filter",
                details: "User ${interaction.user.username} attempted to interact with filters."
            });
            return interaction.reply("You are not authorized to perform this command. Repeated attempts to perform unauthorized actions may result in a ban.");
        }
        const subcommand = interaction.options.getSubcommand();
        switch(subcommand){
            case "help":
                const flagFields = [
                    {
                        name: "d",
                        value: "Delete messages which match this filter."
                    },
                    {
                        name: "b",
                        value: "Immediately ban the user who triggered the filter."
                    },
                    {
                        name: "k",
                        value: "Immediately kick the user who triggered the filter."
                    },
                    {
                        name: "w",
                        value: "Log a warning for the user who triggered the filter."
                    },
                    {
                        name: "s",
                        value: "Ban a user after a certain number of warnings are accumulated (softban)."
                    },
                    {
                        name: "n",
                        value: "Only apply this filter to new users (either fresh accounts, those who have only recently joined the server, or both)."
                    }
                ];

                const optionFields = [
                    {
                        name: "minimumAccountAge",
                        value: `Accounts older than this will not be checked against the filter. Used with the "n" flag. Syntax uses seconds (s), minutes (m), hours (h), or days (d). Example: 1d.`
                    },
                    {
                        name: "minimumServerTime",
                        value: `Accounts which have been in the server for longer than this will not be checked against the filter. Used with the "n" flag. Syntax uses seconds (s), minutes (m), hours (h), or days (d). Example: 1d.`
                    },
                    {
                        name: "warnLimit",
                        value: `How many warnings to accumulate before performing a softban. Used with the "s" flag.`
                    },
                    {
                        name: "warnTime",
                        value: `How close together automated warnings must be for them to count towards triggering a softban. Used with the "s" flag. Syntax uses seconds (s), minutes (m), hours (h), or days (d). Example: 1d.`
                    }];

                const flagsEmbed = new EmbedBuilder()
                    .setTitle("Flags")
                    .setDescription("List of available flags and their uses. The syntax is a comma-separated list without spaces.")
                    .addFields(flagFields);
                const optionsEmbed = new EmbedBuilder()
                    .setTitle("Options")
                    .setDescription("List of available options, their associated flags, and syntax. Enter them as a comma-separated list without spaces.")
                    .addFields(optionFields);

                return await interaction.reply({embeds: [flagsEmbed, optionsEmbed]})

            case "list":
                let data = [];
                const filters = await Blacklist.findAll();
                if (filters.length === 0)
                    return interaction.reply("No filters enabled.");
                filters.forEach(filter => {
                    const id = filter.getDataValue("id");
                    const term = filter.getDataValue("term");
                    const flags = filter.getDataValue("flags");
                    const options = filter.getDataValue("options");
                    const author = filter.getDataValue("creator");
                    data.push({
                        name: `• Filter ID#${id}`,
                        value: `"${term}"\n`
                            + `Flags: ${flags}\n`
                            + `Options: ${options}\n`
                            + `Added by: ${author}`,
                        inline: true
                    });
                });
                const embed = new EmbedBuilder()
                    .setColor(messageColors.filter)
                    .setTitle("Blacklisted terms")
                    .addFields(data)
                    .setTimestamp();
                return interaction.reply({embeds: [embed]})

            case "add":
                const term = interaction.options.getString("term");
                const flags = interaction.options.getString("flags");
                const options = interaction.options.getString("options");

                const flagsArr = flags.split(",");
                const validFlags = ["d", "b", "k", "n", "s", "w", "i"];
                const valid = flagsArr.every(elem => validFlags.includes(elem));
                if (!valid)
                    return interaction.reply("Invalid flags specified. For more information, check /filter help for a list of valid flags and syntax.");
                let optionsArr = [];
                if (options) {
                    optionsArr = options.split(",");
                    const validOptions = this.validateOptions(optionsArr, flagsArr);
                    console.log(validOptions);
                    if (validOptions[1].length !== 0)
                        return interaction.reply("Invalid options or format. Please check /filter help for more information on valid options and syntax."
                            + `\nInvalid options: ${validOptions[1]}`);
                }
                const check = this.validateFlags(flagsArr, optionsArr);
                const finalFlags = check[0].join(',');
                let finalOptions = check[1].join(',');
                const addConfirm = new ButtonBuilder()
                    .setCustomId("confirm")
                    .setLabel("Confirm")
                    .setStyle(ButtonStyle.Success);
                const addCancel = new ButtonBuilder()
                    .setCustomId("cancel")
                    .setLabel("Cancel")
                    .setStyle(ButtonStyle.Danger);
                const row = new ActionRowBuilder()
                    .addComponents(addCancel, addConfirm);

                const addResponse = await interaction.reply({content: `Creating filter for term "${term}" with flags "${finalFlags}" and options "${finalOptions}"\nPlease confirm:`, components: [row]});

                const addCollectorFilter = i => i.user.id === interaction.user.id;

                try {
                    const addConfirmation = await addResponse.awaitMessageComponent({ filter: addCollectorFilter, time: 60000 });
                    if (addConfirmation.customId === 'confirm'){
                        await Blacklist.create({
                            term: term,
                            flags: finalFlags,
                            options: finalOptions ? finalOptions : "none",
                            creator: interaction.user.username
                        }).then(() => {
                            const response = new EmbedBuilder()
                                .setTitle("Filter created")
                                .setDescription("Filter creation successful.")
                                .setTimestamp()
                                .setColor(messageColors.filter)
                                .addFields([{
                                    name: "Term",
                                    value: term
                                },
                                    {
                                        name: "Flags",
                                        value: finalFlags
                                    },
                                    {
                                        name: "Options",
                                        value: finalOptions ? finalOptions : "none"
                                    },
                                    {
                                        name: "Creator",
                                        value: interaction.user.username
                                    }]);
                            return interaction.editReply({embeds: [response], components: []});
                        }).catch(err => {
                            console.log(err);
                            return interaction.editReply({content: "There was an error creating the filter. Please inform the bot's administrator.", components: []});
                        })
                    }
                    else return interaction.editReply({content: "Creation cancelled.", components: []});
                }
                catch (e) {
                    await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
                    console.log(e);
                }
                break;

            case "remove":
                const removeID = interaction.options.getString("filter");
                const removeFilter = await Blacklist.findByPk(removeID);
                if (!removeFilter)
                    return interaction.reply({content: `No filter found with ID ${removeID}. You can confirm current filters with /filter list.`});
                let removeOpts = removeFilter.getDataValue("options");
                const removeEmbed = new EmbedBuilder()
                    .setTitle(`Filter ID ${removeID}`)
                    .addFields([
                        {
                            name: "Term",
                            value: removeFilter.getDataValue("term")
                        },
                        {
                            name: "Flags",
                            value: removeFilter.getDataValue("flags")
                        },
                        {
                            name: "Options",
                            value: removeOpts ? removeOpts : "none"
                        },
                        {
                            name: "Author",
                            value: removeFilter.getDataValue("creator")
                        }]);
                const removeConfirm = new ButtonBuilder()
                    .setCustomId("confirm")
                    .setLabel("Confirm")
                    .setStyle(ButtonStyle.Success);
                const removeCancel = new ButtonBuilder()
                    .setCustomId("cancel")
                    .setLabel("Cancel")
                    .setStyle(ButtonStyle.Danger);
                const removeRow = new ActionRowBuilder()
                    .addComponents(removeCancel, removeConfirm);
                const removeResponse = await interaction.reply({content: `Removing filter ID ${removeID}. Please review the information and confirm that you wish to do this.`, embeds:[removeEmbed], components: [removeRow]});
                const removeCollectorFilter = i => i.user.id === interaction.user.id;
                try {
                    const removeConfirmation = await removeResponse.awaitMessageComponent({
                        filter: removeCollectorFilter,
                        time: 60000
                    });
                    if (removeConfirmation.customId === 'confirm') {
                        Blacklist.destroy({where: {id: removeID}})
                            .then(() => {
                                return interaction.editReply({content: "Filter successfully deleted.", components: []});
                            })
                            .catch(err => {
                                console.log(err);
                                return interaction.editReply({content: "There was an error deleting the filter. Please inform the bot's administrator.", components: []});
                            })
                    }
                }
                catch(err){
                    console.log(err);
                }
            break;
                

            case "edit":
                const filterID = interaction.options.getString('filter');
                const filter = await Blacklist.findOne({where: {id: filterID}});
                if (!filter)
                    return interaction.reply(`No filter found with ID ${filterID}. You can view current available filters with /filter list.`);
                let editTerm = interaction.options.getString('term');
                let editFlags = interaction.options.getString('flags');
                let editOptions = interaction.options.getString('options');
                if (!editTerm && !editFlags && !editOptions)
                    return interaction.reply("Nothing specified to edit. Please either supply a new term, new flags, or new options.");
                if (!editTerm)
                    editTerm = filter.getDataValue('term');
                if (!editFlags)
                    editFlags = filter.getDataValue('flags');
                if (!editOptions)
                    editOptions = filter.getDataValue('options');
                const validate = this.validateFlags(editFlags.split(","), editOptions.split(","));
                const finalEditFlags = validate[0].join(",");
                const finalEditOptions = validate[1].join(",");
                filter.update({term: editTerm, flags: finalEditFlags, options: finalEditOptions}).then(async () => {
                    interaction.reply("Filter updated successfully.");
                    const logsChannel = await interaction.guild.channels.fetch(logChannel);
                    const fields = [{name: "Term", value: editTerm},
                        {name: "Flags", value: finalEditFlags},
                        {name: "Options", value: finalEditOptions ? finalEditOptions : "none"},
                        {name: "Updated by", value: interaction.user.username}];
                    const response = new EmbedBuilder()
                        .setTitle(`Filter ${filterID} updated`)
                        .setTimestamp()
                        .addFields(fields);

                    logsChannel.send({embeds: [response]});

                }).catch(err => {
                    console.log(err);
                    interaction.reply("There was an error updating the filter. Please inform the bot's administrator.");
                })
        }


    },

    validateFlags(flags, options) {
    let optionsArray = [];
    options.forEach(option => {
        option = option.split(":");
        optionsArray[option[0]] = option[1];
    });
    let index = 0;
    flags.forEach(flag => {
        switch (flag.toLowerCase()) {
            case ("s"):
                if (!optionsArray["warnlimit"])
                    options.push("warnlimit:3")
                if (!optionsArray["warntime"])
                    options.push("warntime:0s");
                index = flags.indexOf(flag);
                flags[index] = "s";
                break;
            case ("n"):
                if (!optionsArray["minimumaccountage"] && !optionsArray["minimumservertime"])
                    options.push("minimumservertime:1h");
                index = flags.indexOf(flag);
                flags[index] = "n";
                break;
        }
    });
    if (flags.indexOf("s") !== -1 && flags.indexOf("w") === -1)
        flags.push("w"); // Softban should always warn
    return [flags, options];
    },

    validateOptions(options) {
    const validOptions = ["minimumservertime", "minimumaccountage", "warntime", "warnlimit"];
    let goodOptions = [];
    let badOptions = [];
    options.filter(item => item.split(':').length === 2).forEach(option => {
        const optionPair = option.split(":");
        const name = optionPair[0];
        const value = optionPair[1];
        if (name !== "warnlimit" && value.length !== 2){
            badOptions.push(name + ":" + value);
            let index = options.indexOf(option);
            options.splice(index, 1);
            return;
        }
        if (validOptions.indexOf(name) === -1) {
            badOptions.push(name + ":" + value);
            let index = options.indexOf(option);
            options.splice(index, 1);
            return;
        }
        if (name !== "warnlimit") {
            let measure = value.trim().toLowerCase().slice(-1);
            let duration = value.trim().toLowerCase().slice(0, 1);
            if (measure !== "s" && measure !== "m" && measure !== "h" && measure !== "d" || isNaN(duration) ) {
                badOptions.push(name + ":" + value);
                let index = options.indexOf(option);
                options.splice(index, 1);
                return;
            }
        }
        if (name === "warnlimit" && isNaN(value)) {
            badOptions.push(name + ":" + value);
            let index = options.indexOf(option);
            options.splice(index, 1);
            return;
        }
        goodOptions.push(option);
    });
    options.filter(item => item.split(':').length !== 2).forEach(option => {
        badOptions.push(option);
    });
    return [goodOptions, badOptions];
}
}