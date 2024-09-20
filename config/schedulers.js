const cron = require('node-cron');
const cronData = require('./cronConfig')
const { testCRON, deletePlans, updateCurrencyPrice, expirePaymentIntents } = require('../functions/crons')

for (let data of cronData) {
  cron.schedule(data.time, () => {
    if (data.active) {
      switch (data.cronName) {
        case 'testCRON':
          testCRON();
          break;
        case 'deletePlans':
          deletePlans()
          break;
        case 'updateCurrencyPrice':
          updateCurrencyPrice();
          break;
        case 'expirePaymentIntents':
          expirePaymentIntents();
          break;
      }
    }
  });
}

