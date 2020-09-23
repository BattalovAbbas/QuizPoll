const TelegramBot = require('node-telegram-bot-api');
const https = require('https');
const HTMLParser = require('node-html-parser');
const { v4: uuidv4 } = require('uuid');

const cache = {};

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

bot.on('webhook_error', (error) => {
  console.log(error.code);
});

bot.onText(/\/poll/, (message) => {
  const chatId = message.chat.id;
  const userId = message.from.id;
  requestQuizes().then(uuids => {
    bot.sendMessage(userId, `Создать опрос для:`, {
      reply_markup: {
        inline_keyboard: [
          ...uuids.map(uuid => [{ text: cache[uuid], callback_data: chatId + '_select_' + uuid }]),
        ]
      }
    });
  });
});

bot.on('callback_query', (message) => {
  if (message.data.includes('_select_')) {
    const [ chatId, , uuid ] = message.data.split('_');
    if (cache[uuid]) {
      bot.sendPoll(chatId, cache[uuid], [ 'Иду', 'Не иду', '50/50' ], { is_anonymous: false });
    } else {
      bot.sendMessage(chatId, `Игра не найдена, пожалуйста создайте опрос заново через /poll`);
    }
  }
});

function requestQuizes() {
  return new Promise((resolve, reject) => {
    https.get(`https://saratov.quizplease.ru/schedule`, response => {
      let data = '';
      response.on('data', chunk => {
        data += chunk
      });
      response.on('end', () => data === '‌Symbol not supported' ? reject(data) : resolve(data));
    }).on("error", (err) => {
      console.log("Error: " + err.message);
    });
  }).then(data => {
    const root = HTMLParser.parse(data);
    const dates = root.querySelectorAll('.schedule-column .h3.h3-mb10');
    const times = root.querySelectorAll('.schedule-column .schedule-info .techtext');
    const names = root.querySelectorAll('.schedule-column .h2.h2-game-card.h2-left');
    const places = root.querySelectorAll('.schedule-column .schedule-block-info-bar');
    return dates.map((date, index) => {
      const uuid = uuidv4();
      cache[uuid] = `${ date.innerText }(${ times[index * 3 + 2].innerText }). ${ names[index].innerText }. ${ places[index].childNodes[0].innerText }`;
      return uuid;
    })
  })
}
