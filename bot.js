const TelegramBot = require("node-telegram-bot-api");
const CharacterAI = require("node_characterai");
const characterAI = new CharacterAI();
require("dotenv").config();

const token = process.env.TG_TOKEN;
const botUsername = process.env.TG_BOT_NAME;
const charAiToken = process.env.CHAR_AI_TOKEN;
const characterId = process.env.CHARACTER_ID;

const bot = new TelegramBot(token, { polling: true });

const isBotMentioned = (text) => {
  return text && text.toLowerCase().includes(`@${botUsername.toLowerCase()}`);
};

const standardMode = async (msg, chat) => {
  const chatId = msg.chat.id;
  let text = msg.text || "";
  const isMentioned = isBotMentioned(text);
  text = text.replaceAll(botUsername + " ", "");
  const isReplyToBot =
    msg.reply_to_message && msg.reply_to_message.from.username === botUsername;
  const isPrivate = msg.chat.type == "private";
  const isContinue = isReplyToBot && text === ".";
  const dotMessage = text === "." && isPrivate;

  if (isContinue || dotMessage) {
    text = "";
    bot.deleteMessage(chatId, msg.message_id);
  } else if (isReplyToBot) {
    text =
      msg.from.first_name +
      " said: " +
      text +
      " by replying to: " +
      msg.reply_to_message.text;
  } else if (!text.includes("*")) {
    text = msg.from.first_name + " said: " + text;
  }
  if (isMentioned || isReplyToBot || isPrivate) {
    let response;
    try {
      response = await chat.sendAndAwaitResponse(text, true);
      if (isPrivate || isContinue) {
        bot.sendMessage(chatId, response.text);
      } else {
        bot.sendMessage(chatId, response.text, {
          reply_to_message_id: msg.message_id,
        });
      }
    } catch (e) {
      bot.sendMessage(
        chatId,
        "Error"
      );
    }
  }
};

const answerOnAllMessagesMode = async (msg, chat) => {
  const chatId = msg.chat.id;
  let text = msg.text || "";
  text = msg.from.first_name + " said: " + text;
  try {
    response = await chat.sendAndAwaitResponse(text, true);
    bot.sendMessage(chatId, response.text);
  } catch (e) {
    bot.sendMessage(
      chatId,
      "Error"
    );
  }
};

let answerOnAllMessages = false;

(async () => {
  await characterAI.authenticateWithToken(charAiToken);
  const chat = await characterAI.createOrContinueChat(characterId);
  bot.on("message", async (msg) => {
    answerOnAllMessages === false
      ? standardMode(msg, chat)
      : answerOnAllMessagesMode(msg, chat);
  });
})();

bot.onText(/\/answerOnAllMessages/, (msg) => {
  answerOnAllMessages = true;
});

bot.onText(/\/stopAnsweringOnAllMessages/, (msg) => {
  answerOnAllMessages = false;
});

bot.on("polling_error", (error) => {
  console.log(error);
});
