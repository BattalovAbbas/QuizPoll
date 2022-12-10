process.env.NTBA_FIX_319 = 1;

const TelegramBot = require('node-telegram-bot-api');
const https = require('https');
const HTMLParser = require('node-html-parser');
const { v4: uuidv4 } = require('uuid');

const cache = {};

let bot;
const telegramToken = process.env.TELEGRAM_TOKEN || '1220613465:AAGplFC8Ug7kT_PVRMWjaF4T9A5rLFuTimU';
if (process.env.NODE_ENV === 'production') {
  const port = process.env.PORT || 443;
  const url = process.env.CUSTOM_ENV_VARIABLE || '0.0.0.0';
  bot = new TelegramBot(telegramToken, { webHook: { port, url } });
  bot.setWebHook(process.env.CUSTOM_ENV_VARIABLE + ':' + port + '/bot' + telegramToken);
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
  bot.sendMessage(userId, `Создание`);
  requestQuizes(userId).then(uuids => {
    bot.sendMessage(userId, `Создать опрос для:`, {
      reply_markup: {
        inline_keyboard: [
          ...uuids.map(uuid => [{ text: cache[uuid], callback_data: chatId + '_select_' + uuid }]),
        ]
      }
    });
  });
});

bot.onText(/\/create/, (message) => {
  const chatId = message.chat.id;
  bot.sendPoll(chatId, message.text.replace('/create', '').trim(), [ 'Да, иду \u{1F4AF}%', 'Нет, не смогу \u{1F614}', 'Думаю \u{1F914} \u{23F3}', 'Играю за другую команду \u{1F6B6}', 'Со мной +1 \u{1F46F}' ], { is_anonymous: false });
});

bot.on('callback_query', (message) => {
  if (message.data.includes('_select_')) {
    const [ chatId, , uuid ] = message.data.split('_');
    if (cache[uuid]) {
      bot.sendPoll(chatId, cache[uuid], [ 'Да, иду \u{1F4AF}%', 'Нет, не смогу \u{1F614}', 'Думаю \u{1F914} \u{23F3}', 'Играю за другую команду \u{1F6B6}', 'Со мной +1 \u{1F46F}' ], { is_anonymous: false });
    } else {
      bot.sendMessage(chatId, `Игра не найдена, пожалуйста создайте опрос заново через /poll`);
    }
  }
});

function requestQuizes(userId) {
  return new Promise((resolve, reject) => {
    bot.sendMessage(userId, `запрос`);
    https.get(`https://saratov.quiz-please.ru/schedule`, response => {
      bot.sendMessage(userId, `ответ`);
      let data = '';
      response.on('data', chunk => {
        data += chunk
      });
      response.on('end', () => data === '‌Symbol not supported' ? reject(data) : resolve(data));
    }).on("error", (err) => {
      bot.sendMessage(userId, err.message);
      console.log("Error: " + err.message);
    });
  }).then(data => {
    const games = HTMLParser.parse(data).querySelectorAll('.schedule-column');
    bot.sendMessage(userId, `парсинг`);
    return games.map(game => {
      const date = game.querySelector('.h3.h3-mb10');
      const times = game.querySelectorAll('.schedule-info').filter(info => info.querySelector('.schedule-icon'));
      const names = game.querySelectorAll('.h2.h2-game-card');
      const place = game.querySelector('.schedule-block-info-bar');
      const uuid = uuidv4();
      cache[uuid] = `${ date.innerText.trim() }(${ times[1].innerText.trim() }).\n\r${ names[0].innerText.replace('SARATOV', '').trim() } ${ names[1].innerText.trim() }.\n\r${ place ? place.childNodes[0].innerText.trim() : '' }`;
      return uuid;
    })
  })
}