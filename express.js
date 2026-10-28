// Reklama Banner Bot — Express.js webhook server
// Node.js 18+
// Setup: npm install && copy .env.example to .env && npm start
require("dotenv").config();

const express = require("express");
const { Telegraf, Markup } = require("telegraf");
const sharp = require("sharp");

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN;
const PORT = Number(process.env.PORT || 3000);
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "change-this-secret";

if (!TOKEN) {
  console.error("BOT_TOKEN .env faylida ko‘rsatilmagan.");
  process.exit(1);
}

const bot = new Telegraf(TOKEN);
const users = new Map();     // Demo only: use a database for production.
const sessions = new Map();

const LANG = {
  uz: {
    welcome: "🚀 Reklama Banner Botiga xush kelibsiz!",
    choose: "Tilni tanlang:",
    menu: "Kerakli bo‘limni tanlang:",
    create: "🎨 Reklama yaratish",
    account: "📊 Mening hisobim",
    title: "✍️ Reklama sarlavhasini yuboring:",
    desc: "📝 Reklama matnini yuboring:",
    link: "🔗 Havolani yuboring yoki - yozing:",
    ready: "✅ Mana, reklama banneringiz tayyor!",
    free: "🆓 Bepul reklama qoldi:",
    pay: "⭐ 3 ta bepul reklamangiz tugadi. Keyingi reklama — 25 Telegram Stars.",
    payBtn: "⭐ 25 Stars — to‘lash",
    paid: "✅ To‘lov qabul qilindi. Endi bitta reklama yaratishingiz mumkin.",
    invalidLink: "Havola http:// yoki https:// bilan boshlanishi kerak. Havola bo‘lmasa - yozing.",
    error: "Xatolik yuz berdi. Qaytadan urinib ko‘ring."
  },
  ru: {
    welcome: "🚀 Добро пожаловать в Рекламный Бот!",
    choose: "Выберите язык:",
    menu: "Выберите раздел:",
    create: "🎨 Создать рекламу",
    account: "📊 Мой аккаунт",
    title: "✍️ Отправьте заголовок рекламы:",
    desc: "📝 Отправьте текст рекламы:",
    link: "🔗 Отправьте ссылку или введите -:",
    ready: "✅ Ваш рекламный баннер готов!",
    free: "🆓 Бесплатных реклам осталось:",
    pay: "⭐ Бесплатный лимит исчерпан. Следующая реклама — 25 Telegram Stars.",
    payBtn: "⭐ Оплатить 25 Stars",
    paid: "✅ Оплата принята. Теперь можно создать одну рекламу.",
    invalidLink: "Ссылка должна начинаться с http:// или https://. Если ссылки нет, отправьте -.",
    error: "Произошла ошибка. Попробуйте ещё раз."
  },
  en: {
    welcome: "🚀 Welcome to Advertising Banner Bot!",
    choose: "Choose your language:",
    menu: "Choose a section:",
    create: "🎨 Create an ad",
    account: "📊 My account",
    title: "✍️ Send your ad headline:",
    desc: "📝 Send your ad text:",
    link: "🔗 Send a link or type -:",
    ready: "✅ Your advertising banner is ready!",
    free: "🆓 Free ads remaining:",
    pay: "⭐ Your 3 free ads are used. The next ad costs 25 Telegram Stars.",
    payBtn: "⭐ Pay 25 Stars",
    paid: "✅ Payment received. You can now create one ad.",
    invalidLink: "The link must start with http:// or https://. Send - if there is no link.",
    error: "Something went wrong. Please try again."
  },
  tr: {
    welcome: "🚀 Reklam Banner Botuna hoş geldiniz!",
    choose: "Dil seçin:",
    menu: "Bir bölüm seçin:",
    create: "🎨 Reklam oluştur",
    account: "📊 Hesabım",
    title: "✍️ Reklam başlığını gönderin:",
    desc: "📝 Reklam metnini gönderin:",
    link: "🔗 Bağlantıyı gönderin veya - yazın:",
    ready: "✅ Reklam bannerınız hazır!",
    free: "🆓 Kalan ücretsiz reklam:",
    pay: "⭐ 3 ücretsiz reklamınız bitti. Sonraki reklam 25 Telegram Stars.",
    payBtn: "⭐ 25 Stars öde",
    paid: "✅ Ödeme alındı. Bir reklam oluşturabilirsiniz.",
    invalidLink: "Bağlantı http:// veya https:// ile başlamalı. Bağlantı yoksa - gönderin.",
    error: "Bir hata oluştu. Tekrar deneyin."
  }
};

function getUser(id) {
  if (!users.has(id)) users.set(id, { lang: "uz", freeUsed: 0, credits: 0 });
  return users.get(id);
}
function tr(id, key) { return LANG[getUser(id).lang][key]; }

function languageKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🇺🇿 O‘zbekcha", "lang_uz"), Markup.button.callback("🇷🇺 Русский", "lang_ru")],
    [Markup.button.callback("🇬🇧 English", "lang_en"), Markup.button.callback("🇹🇷 Türkçe", "lang_tr")]
  ]);
}
function mainKeyboard(id) {
  return Markup.keyboard([[tr(id, "create")], [tr(id, "account"), "🌐 Til / Language"]]).resize();
}
function escapeXml(s = "") {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function limit(s, n) { return [...String(s || "")].slice(0, n).join(""); }

async function makeBanner(title, description, link) {
  const heading = escapeXml(limit(title, 48));
  const body = escapeXml(limit(description, 150));
  const target = escapeXml(limit(link || "CONTACT / MORE INFO", 65));
  const svg = `
  <svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#10152f"/><stop offset="55%" stop-color="#5427a8"/>
      <stop offset="100%" stop-color="#08b99a"/></linearGradient></defs>
    <rect width="1080" height="1080" rx="64" fill="url(#g)"/>
    <circle cx="920" cy="150" r="240" fill="#fff" opacity=".07"/>
    <circle cx="110" cy="960" r="250" fill="#fff" opacity=".06"/>
    <rect x="55" y="55" width="970" height="970" rx="45" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="3"/>
    <text x="100" y="150" font-family="Arial,sans-serif" font-size="30" font-weight="bold" fill="#baffea">✦ YOUR ADVERTISEMENT</text>
    <foreignObject x="100" y="225" width="880" height="245">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;font-size:65px;font-weight:700;line-height:1.12;color:white;overflow-wrap:anywhere">${heading}</div>
    </foreignObject>
    <foreignObject x="100" y="500" width="880" height="270">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;font-size:34px;line-height:1.4;color:#f2f1ff;overflow-wrap:anywhere">${body}</div>
    </foreignObject>
    <rect x="100" y="820" width="880" height="110" rx="27" fill="#fff"/>
    <foreignObject x="125" y="840" width="830" height="70">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;font-size:27px;font-weight:bold;text-align:center;color:#24204d;overflow-wrap:anywhere">${target}</div>
    </foreignObject>
    <text x="540" y="980" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" fill="#fff">CREATED WITH AD BANNER BOT</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

bot.start(async (ctx) => {
  getUser(ctx.from.id);
  await ctx.reply("🌐 Tilni tanlang / Choose your language:", languageKeyboard());
});

bot.action(/^lang_(uz|ru|en|tr)$/, async (ctx) => {
  getUser(ctx.from.id).lang = ctx.match[1];
  await ctx.answerCbQuery();
  await ctx.reply(tr(ctx.from.id, "welcome"));
  await ctx.reply(tr(ctx.from.id, "menu"), mainKeyboard(ctx.from.id));
});

bot.hears("🌐 Til / Language", (ctx) =>
  ctx.reply(tr(ctx.from.id, "choose"), languageKeyboard())
);

bot.hears(/^(🎨 Reklama yaratish|🎨 Создать рекламу|🎨 Create an ad|🎨 Reklam oluştur)$/, async (ctx) => {
  const id = ctx.from.id;
  const user = getUser(id);
  if (user.freeUsed >= 3 && user.credits < 1) {
    return ctx.reply(tr(id, "pay"), Markup.inlineKeyboard([
      [Markup.button.callback(tr(id, "payBtn"), "buy_ad")]
    ]));
  }
  sessions.set(id, { step: "title" });
  await ctx.reply(tr(id, "title"));
});

bot.hears(/^(📊 Mening hisobim|📊 Мой аккаунт|📊 My account|📊 Hesabım)$/, async (ctx) => {
  const id = ctx.from.id, user = getUser(id);
  await ctx.reply(`${tr(id, "free")} ${Math.max(0, 3 - user.freeUsed)}\n⭐ Paid credits: ${user.credits}`, mainKeyboard(id));
});

bot.action("buy_ad", async (ctx) => {
  const id = ctx.from.id, user = getUser(id);
  await ctx.answerCbQuery();
  if (user.freeUsed < 3 || user.credits > 0) {
    return ctx.reply("Hozir to‘lov kerak emas. /start");
  }
  await ctx.replyWithInvoice({
    title: "Advertising banner",
    description: "One custom advertising banner",
    payload: `ad_credit_${id}_${Date.now()}`,
    provider_token: "",
    currency: "XTR",
    prices: [{ label: "One advertising banner", amount: 25 }]
  });
});

bot.on("pre_checkout_query", async (ctx) => {
  const id = ctx.from.id, user = getUser(id);
  const payload = ctx.preCheckoutQuery.invoice_payload;
  const valid = payload.startsWith(`ad_credit_${id}_`) &&
    user.freeUsed >= 3 && user.credits === 0;
  await ctx.answerPreCheckoutQuery(valid, valid ? undefined : "Please reopen the bot and try again.");
});

bot.on("message", async (ctx, next) => {
  if (!ctx.message.successful_payment) return next();
  const id = ctx.from.id, user = getUser(id);
  const payment = ctx.message.successful_payment;
  if (payment.currency === "XTR" && payment.total_amount === 25 &&
      payment.invoice_payload.startsWith(`ad_credit_${id}_`) &&
      user.freeUsed >= 3 && user.credits === 0) {
    user.credits = 1;
    return ctx.reply(tr(id, "paid"), mainKeyboard(id));
  }
  await ctx.reply("Payment received. If your credit is missing, contact support.");
});

bot.on("text", async (ctx, next) => {
  const id = ctx.from.id, session = sessions.get(id);
  if (!session) return next();
  const value = ctx.message.text.trim();
  if (value.startsWith("/")) return next();

  if (session.step === "title") {
    session.title = value.slice(0, 180);
    session.step = "description";
    return ctx.reply(tr(id, "desc"));
  }
  if (session.step === "description") {
    session.description = value.slice(0, 500);
    session.step = "link";
    return ctx.reply(tr(id, "link"));
  }
  if (session.step === "link") {
    if (value !== "-" && !/^https?:\/\/\S+$/i.test(value)) {
      return ctx.reply(tr(id, "invalidLink"));
    }
    session.link = value === "-" ? "" : value;
    const user = getUser(id);
    try {
      const png = await makeBanner(session.title, session.description, session.link);
      await ctx.replyWithPhoto({ source: png }, { caption: tr(id, "ready") });
      if (user.freeUsed < 3) user.freeUsed++;
      else if (user.credits > 0) user.credits--;
      else {
        sessions.delete(id);
        return ctx.reply(tr(id, "pay"));
      }
      await ctx.reply(`${tr(id, "free")} ${Math.max(0, 3 - user.freeUsed)}`, mainKeyboard(id));
    } catch (err) {
      console.error(err);
      await ctx.reply(tr(id, "error"));
    } finally {
      sessions.delete(id);
    }
  }
});

// Express health endpoint and Telegram webhook endpoint.
app.get("/", (_req, res) => res.send("🚀 Advertising Banner Bot is running."));
app.post(`/telegram/${WEBHOOK_SECRET}`, (req, res) => {
  bot.handleUpdate(req.body, res).catch((err) => {
    console.error("Webhook error:", err);
    if (!res.headersSent) res.sendStatus(500);
  });
});

async function start() {
  app.listen(PORT, () => console.log(`Express server listening on port ${PORT}`));
  if (process.env.WEBHOOK_URL) {
    const url = `${process.env.WEBHOOK_URL.replace(/\/$/, "")}/telegram/${WEBHOOK_SECRET}`;
    await bot.telegram.setWebhook(url, { secret_token: WEBHOOK_SECRET });
    console.log("Telegram webhook configured.");
  } else {
    // Local development mode: use long polling; do not configure a webhook at the same time.
    await bot.launch();
    console.log("Bot started with long polling.");
  }
}
start().catch((err) => { console.error(err); process.exit(1); });

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
