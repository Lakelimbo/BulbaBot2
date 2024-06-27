// @ts-check
/**
 * =======================================
 * Migration that will populate the names
 * into the `ModLogs` table
 * =======================================
 */

import { Client, GatewayIntentBits } from "discord.js";
import { guildID, token } from "./config.json";
import ModLogs from "./includes/sqlModLogs";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const warnings = await ModLogs.findAll();

warnings.forEach(async (warning) => {
  /**
   * Takes the logged User ID
   *
   * @type {string}
   * */
  const userID = warning.getDataValue("loggedID").toString();
  /**
   * Fetches the Guild
   * 
   * @type {import("discord.js").Guild} 
   */
  const guild = await client.guilds.fetch(guildID);
  /** 
   * Member (user) of a Guild
   * 
   * @type {import("discord.js").GuildMember} 
   */
  const member = await guild.members.fetch(userID);
  /** 
   * An user from Discord in general.   
   * 
   * @type {import("discord.js").User}
   */
  const user = await client.users.fetch(userID);

  let nick = "";
  if (!member) {
    nick = user.username;
  } else {
    // TO-DO:
    // - I assume we cannot send `null` as a response there?
    nick = member.nickname || "<NO-NICK>";
  }

  const username = user.username;

  warning
    .update({ loggedNick: nick, loggedUsername: username })
    .then(() => {
      console.log(
        `Updated: ${warning.getDataValue("id")}\nNick: ${nick}\n` +
          `Username: ${username}`
      );
    })
    .catch((/** @type {Error} */ err) => {
      console.log(err);
    });
});

client.login(token);
