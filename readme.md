# BulbaBot, A Customizable Bot Designed for BulbaGarden

## Overview
BulbaBot was designed to fill the role of BulbaGarden's moderation bot for its public Discord server.
It is capable of performing moderation tasks such as kicking and banning users, as well as adding roles for personal
preferences or moderation. It logs all moderation actions taken, so that you no longer
need to rely on the Discord audit logs to review privileged actions.

The bot is built on the Discord.js framework, which runs on Node.js.

## Installation
Installing BulbaBot is not terribly complicated, but it does require that you create your own bot app in the Discord
developer portal. This process is fairly simple and well documented, and you can create your app at
https://discord.com/developers/applications.
You should also enable developer mode in your settings, to make
it easier to get the IDs that you will need for your configuration file.

Once you've created your own bot application, you'll need to create your config.json file with some details about
you server. To get started, copy your `includes/config.json.template` file into the root of your bot directory and
fill out the values accordingly. Not everything is mandatory, but note that not everything will work
if you don't fill out all the moderation values.

Be absolutely sure that you do not commit your config.json file if you fork this repository. Your token, which is
generated when you create your bot's application, is akin to your password. If you upload it, anyone who sees it
can log into your bot and use it.

Once you've created your configuration file, you'll need to install nodeJS and the required dependencies.
You can find node at https://nodejs.org. Once you install it, you'll need to navigate to the bot's install directory
and run `npm install`. That should automatically install all the necessary dependencies.

##  Running the Bot
To start the bot, you'll need to run it with node. You can do this from the command line by navigating to the bot's
install directory and running `node index.js`, although this will only keep the bot going until your current CLI
session is terminated. Alternatives include using `screen` to run the bot in its own, detached session (not recommended)
or using systemd to register the bot as a service (highly recommended). This bot has not been tested on Windows
machines, thus there are no effective solutions currently in place for running it in said environments.
Since this bot is in its early stages of development, you can help by providing solutions for Windows environments.

## Moderation Notes
The bot currently has several main moderation functions. This section will break down their functionality and explain
their purpose and related configuration settings.

* Kicks, Bans, and Mutes require that the person requesting the action actually has the privileges
  required. You will need to manually configure your Discord permissions settings for your moderators.
* Mutes actually apply a role which will restrict a user's ability to send messages in the server. Regular
  Discord mutes are for voice channels, but these are different in that they are designed to prevent users from
  sending messages in text channels. When a user is muted, an unmute will be scheduled automatically based on the duration
  given, and this unmute will be rescheduled if the bot is restarted before it occurs.
  You will need to configure the permissions for this role manually.
* `log` will write a warning to the database for a specific user, typically used to keep track of times when a moderator
  speaks officially to inform a user that they are not following the server rules. Actions such as kicks and bans will
  be logged automatically, and the `modlogs` command can be used to view all warnings and moderation actions for a user.
* Ignores are designed to allow you to map a group to a role, typically used to ignore notifications from channels that
  tend to be particularly lively or which regularly send out pings. Again, the permissions for the roles will need
  to be configured manually. The syntax for the command is `ignore (group)`, which will add the ignore role if it
  is not present, or remove it if it is.
* Stash and pop are used to archive and unarchive channels, respectively. To use this functionality, you will need to
  create a category to put the archived channels in.

## Logs
Currently, the bot only produces logs to the console. If you utilize the systemd approach, this works perfectly
because the logs will be written to the journal, making them viewable with `journalctl -u (botname).service`.
Currently, I would like to add in the ability to log to a file, although this will require adding quite a bit of code.