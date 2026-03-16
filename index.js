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
  const apiUrl = 'https://api.quizplease.ru/api/games/schedule/57?per_page=30&order=date&meta%5B%5D=places_ids&meta%5B%5D=dates&statuses%5B%5D=0&statuses%5B%5D=1&statuses%5B%5D=2&statuses%5B%5D=3&statuses%5B%5D=5';

  const formatDate = (isoDate) => {
    if (!isoDate) return { dateText: '', timeText: '' };
    const [datePart, timePart] = isoDate.split(' ');
    if (!datePart) return { dateText: '', timeText: timePart || '' };

    const [day, month, year] = datePart.split('.');
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const monthName = months[Number(month) - 1] || '';
    return {
      dateText: monthName ? `${Number(day)} ${monthName} ${year}` : datePart,
      timeText: timePart || ''
    };
  };

  try {
    return axios.get(apiUrl)
      .then(response => {
        const gamesArray = response?.data?.data?.data || [];
        return gamesArray.map(game => {
          const { date = '', title = '', place = {} } = game;
          const { dateText, timeText } = formatDate(date);
          const placeText = place.title ? `${place.title}${place.address ? `, ${place.address}` : ''}` : `${place.address || ''}`;

          const uuid = uuidv4();
          cache[uuid] = `${dateText} (${timeText}).\n\r${title}.\n\r${placeText}`;
          return uuid;
        });
      })
      .catch(err => {
        console.error('Ошибка requestQuizes API', err);
        bot.sendMessage(userId, 'Попробуйте еще');
        return [];
      });
  } catch (e) {
    console.error('Ошибка requestQuizes', e);
    return Promise.resolve([]);
  }
}
