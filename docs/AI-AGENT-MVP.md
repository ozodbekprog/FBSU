# AI agent (MVP) — o'qish bosqichi

> 2026-10-12. Fariza. `assistant` modulini oddiy chatbotdan agentga o'tkazishning 1-bosqichi.

## Nima qilindi

`/api/assistant/chat` endi **tool-calling agent** orqali ishlaydi (DeepSeek `deepseek-chat`):

1. `src/lib/ai.ts` — `agentChatStep()`: tool chaqiruvlarini ID bilan qaytaradi (ko'p qadamli sikl uchun).
2. `src/server/assistant/data.ts` — sof mantiq (yig'ish, chegaralash) — unit testlangan.
3. `src/server/assistant/agent.ts` — tool'lar + agent sikli (`runAssistantAgent`, maks 2 tool raundi).
4. `src/app/api/assistant/chat/route.ts` — agentga ulandi; agent ishlamasa — eski `askAi` fallback (regressiya yo'q).

## Tool'lar (faqat o'qish; yozuvchi tool'lar keyingi bosqich)

| Rol | Tool | Nima qaytaradi |
|---|---|---|
| Talaba | `davomatim` | Foiz, holatlar, kurslar kesimi, oxirgi yozuvlar, 80% chegarasi |
| Talaba | `baholarim` | Test/topshiriq natijalari foizda, o'rtacha |
| Talaba | `jadvalim` | Guruh jadvali (hafta yoki kun) |
| Talaba | `muddatlarim` | Yaqin muddatlar + topshirilgan/ishlangan belgisi |
| O'qituvchi | `darslarim` | O'z dars jadvali, guruhlar bilan |
| O'qituvchi | `guruhlarim` | O'z guruhlari + talaba soni |
| O'qituvchi | `guruh_talabalari` | Guruh talabalari ro'yxati |
| O'qituvchi | `guruh_davomati` | Talabalar kesimida davomat, 80% dan pastlar |
| O'qituvchi | `guruh_baholari` | Talabalar kesimida o'rtacha, 60% dan pastlar |

## Xavfsizlik modeli

- Har tool **foydalanuvchi huquqi doirasida** ishlaydi: talaba — faqat o'z ma'lumoti; o'qituvchi — faqat o'z kurs/guruhlari (jadval + o'quv reja bo'yicha); begona guruhga so'rov "topilmadi" javobini oladi.
- `ADMIN` — cheklovsiz (guruh ro'yxati 80 ta bilan cheklangan).
- Yozuvchi amal yo'q (MVP) — keyingi bosqichda har yozuv `confirm` + AuditLog bilan.
- Rate limit: 60 so'rov/soat/foydalanuvchi (avvalgi qoida saqlangan).

## Tekshirilgan

- `npx tsc --noEmit`, `npm run build` — toza.
- Unit testlar: `tests/assistant-agent-data.test.ts` (8), `tests/assistant-agent-loop.test.ts` (4) — jami 276 test ✓.
- Jonli DB smoke (vaqtinchalik test, o'chirilgan): o'qituvchi (t.math@ttpu.uz) va talaba (ozodbek@ttpu.uz) bo'yicha barcha tool'lar real ma'lumot qaytardi; begona guruhga ruxsat yo'q ✓.

## Keyingi bosqichlar (taklif)

1. **Yozuvchi tool'lar + tasdiq oqimi**: davomat belgilash, baho qo'yish (GradeChangeRequest orqali), hujjat draft (Document), xabarnoma — hammasi `tasdiqla/rad et` bilan.
2. **Hujjat agenti**: buyruq/ma'lumotnoma shablonlarini to'ldirish (draft → review → signed zanjiri allaqachon bor).
3. **Avtomatik routine**: haftalik hisobot, muddati o'tganlar eslatmasi, at-risk ro'yxati — cron/notification orqali.
4. **HEMIS ko'prigi**: eksport formati spetsifikatsiyasi olingach, agent "HEMIS paketini tayyorla" qila oladi.
