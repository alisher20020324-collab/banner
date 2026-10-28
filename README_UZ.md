# Premium Ad Banner Bot (Express.js)

## Imkoniyatlar
- 4 til: o‘zbek, rus, ingliz, turk
- Matn va havoladan PNG reklama banneri
- Har bir foydalanuvchiga 3 ta bepul banner
- Keyingi banner uchun 25 Telegram Stars
- Express.js server va Telegram webhook rejimi

## O‘rnatish
1. Node.js 18 yoki yangiroq versiyani o‘rnating.
2. Terminalda loyiha papkasiga kiring.
3. `npm install` buyrug‘ini bajaring.
4. `.env.example` faylidan nusxa olib `.env` deb nomlang.
5. `.env` ichidagi `BOT_TOKEN` qiymatiga BotFather tokenini kiriting.
6. `npm start` buyrug‘ini bajaring.

Lokal testda bot long polling orqali ishlaydi. Serverga joylaganda HTTPS manzilni `WEBHOOK_URL` ga kiriting.

## Muhim
Bu demo hisoblagichlarni xotirada saqlaydi. Bot qayta ishga tushsa yoki hosting qayta ishga tushsa, bepul limit va kreditlar yo‘qoladi. Haqiqiy mijozlar uchun SQLite/PostgreSQL, to‘lov tekshiruvi va takroriy to‘lovlardan himoya qo‘shing. Tokenni hech kimga yubormang.

`express.js` fayli `package.json` dagi start skriptiga mos keladi.
