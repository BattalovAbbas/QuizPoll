const TelegramBot = require('node-telegram-bot-api');

const telegramToken = process.env.TELEGRAM_TOKEN;
let bot;
if (process.env.NODE_ENV === 'production') {
  const port = process.env.PORT || 443;
  const host = process.env.HOST || '0.0.0.0';
  bot = new TelegramBot(telegramToken, { webHook: { port, host } });
  bot.setWebHook(process.env.CUSTOM_ENV_VARIABLE + ':443' + '/bot' + telegramToken);
} else {
  bot = new TelegramBot(telegramToken, { polling: true });
}

bot.on('polling_error', (err) =>
  console.log(err)
);

bot.onText(/\/poll/, (message) => {
  const userId = message.chat.id;
  bot.sendMessage(userId, `Please write choose question`)
});
