-- Demo hisoblar production ma'lumotlar bazasidagi nomlarga moslashtirildi.
--
-- Sabab: login sahifasidagi email'lar mahalliy bazaga qarab o'zgartirilgan
-- edi, ammo production'da eski nomlar ishlaydi. Bu migration mahalliy
-- bazani production bilan bir xilga keltiradi — aks holda deploy qilinganda
-- demo kirishlari ishlamay qoladi.
--
-- Parol o'zmaydi (`ttpu1234` production va lokal bir xil).

UPDATE "User" SET email = 'prorektor-oquv@ttpu.uz' WHERE email = 'prorektor@ttpu.uz';
UPDATE "User" SET email = 'dekan-ki@ttpu.uz'     WHERE email = 'dekan@ttpu.uz';
UPDATE "User" SET email = 'kafedra-di@ttpu.uz'   WHERE email = 'kafedra@ttpu.uz';
UPDATE "User" SET email = 'tyutor-1@ttpu.uz'      WHERE email = 'tyutor@ttpu.uz';
UPDATE "User" SET email = 'kutubxona@ttpu.uz'     WHERE email = 'xodim@ttpu.uz';
UPDATE "User" SET email = 'fizika@ttpu.uz'        WHERE email = 'n.mahamatov@ttpu.uz';

-- Production'da `registrar@` yo'q, eski `registrator@` ishlaydi.
UPDATE "User" SET email = 'registrator@ttpu.uz' WHERE email = 'registrar@ttpu.uz';
