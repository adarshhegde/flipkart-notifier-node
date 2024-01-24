<br />
<div align="center">
  <a href="https://github.com/othneildrew/Best-README-Template">
    <img src="https://raw.githubusercontent.com/telegraf/telegraf/HEAD/docs/assets/logo.svg" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Flipkart Stock Notifier - Telegram Bot (2020) (Unmaintained)</h3>

  <p align="center">
This is a service that was designed to scrape a Flipkart product's page and detect when that product comes in stock and send a high priority notification on Telegram with the help of a Telegram Bot, the bot allows the user to specify the products to check stocks for, by providing the product link.
</div>

- It is using MongoDB for storing the details of the products and the user associated with it.
- The delta time of delay observed between restocking and notification is an average 6 seconds, where 5 seconds is the time interval set for the scraping task.
- It is using PM2 for high availability and recovery from crashes,so the user will not need to worry about missing out on a restock.
- By using Puppeteer, the bot can perform web scraping in a stable and fast way.

### Built With

![NodeJS](https://img.shields.io/badge/Node.JS-green?style=for-the-badge&logo=Node.js&logoColor=white) <br>
![Telegraf](https://img.shields.io/badge/Telegraf&nbsp;(npm)-red?style=for-the-badge&logo=Node.js&logoColor=white)
