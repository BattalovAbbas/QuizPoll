process.env.NTBA_FIX_319 = 1;

const TelegramBot = require('node-telegram-bot-api');
const HTMLParser = require('node-html-parser');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios')
const https = require('https');

const cache = {};

let bot;
const telegramToken = process.env.TELEGRAM_TOKEN;
if (process.env.NODE_ENV === 'production') {
  const port = process.env.PORT || 443;
  const url = process.env.CUSTOM_ENV_VARIABLE || '0.0.0.0';
  bot = new TelegramBot(telegramToken, { webHook: { port, url } });
  bot.setWebHook(url + ':' + port + '/bot' + telegramToken);
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
  try {
    return new Promise((resolve, reject) => {
      https.get(`https://saratov.quizplease.ru/schedule`, response => {
        let data = '';
        response.on('data', chunk => {
          data += chunk
        });
        response.on('end', () => data === '‌Symbol not supported' ? reject(data) : resolve(data));
      }).on("error", (err) => {
        console.error("Error: " + err.message);
      });
    }).then(data => {
      const games = HTMLParser.parse(data).querySelectorAll('.game-card');
      return games.map(game => {
        const dateEl = game.querySelector('.game-card__date') || game.querySelector('.h3.h3-mb10');
        const nameEls = game.querySelectorAll('.game-card__name-wrapper .game-card__name');
        const timeEl = game.querySelector('.game-card__location-wrapper:nth-of-type(2) .game-card__location-text') || game.querySelector('.schedule-info .schedule-icon');
        const locationTitleEl = game.querySelector('.game-card__location-text__title') || game.querySelector('.schedule-block-info-bar');
        const locationSubtitleEl = game.querySelector('.game-card__location-text__subtitle');

        const dateText = dateEl ? dateEl.innerText.trim() : '';
        const timeText = timeEl ? timeEl.innerText.trim() : '';
        const placeText = locationTitleEl ? locationTitleEl.innerText.trim() : (locationSubtitleEl ? locationSubtitleEl.innerText.trim() : '');
        const gameName = nameEls[0] ? nameEls[0].innerText.replace('SARATOV', '').trim() : '';
        const gameRound = nameEls[1] ? nameEls[1].innerText.trim() : '';

        const uuid = uuidv4();
        cache[uuid] = `${dateText} (${timeText}).\n\r${gameName} ${gameRound}.\n\r${placeText}`;
        return uuid;
      })
    })
    .catch(err => {
      console.error('Ошибка', err);
      bot.sendMessage(userId, 'Попробуйте еще');
    })
  } catch(e) {
    console.error('Ошибка', e);
  }
}
