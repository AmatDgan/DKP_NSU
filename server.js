// server.js — точка входа для Phusion Passenger (Node.js на Sprinthost).
// Passenger запускает ИМЕННО этот файл вместо команды `next start`.
// Он поднимает Next.js в продакшн-режиме и отдаёт ему все запросы,
// поэтому rewrites, заголовки безопасности, NextAuth и API продолжают работать.
//
// ВАЖНО: перед запуском проект должен быть собран командой `npm run build`
// (на сервере или локально), иначе папки .next не будет и app.prepare() упадёт.

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

// dev: false — продакшн-режим, без горячей пересборки.
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(process.env.PORT || 3000, () => {
    console.log("Next.js запущен через Passenger");
  });
});
