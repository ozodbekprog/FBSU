import type { Dictionary } from "./uz";
import { shell } from "./dict/ru/shell";
import { fb } from "./dict/ru/fb";
import { dash } from "./dict/ru/dash";
import { crs } from "./dict/ru/crs";
import { sch } from "./dict/ru/sch";
import { grd } from "./dict/ru/grd";
import { msg } from "./dict/ru/msg";
import { adm } from "./dict/ru/adm";
import { msc } from "./dict/ru/msc";
import { brd } from "./dict/ru/brd";
import { lab } from "./dict/ru/lab";
import { stf } from "./dict/ru/stf";
import { pay } from "./dict/ru/pay";
import { tsk } from "./dict/ru/tsk";
import { acc } from "./dict/ru/acc";
import { doc } from "./dict/ru/doc";
import { prn } from "./dict/ru/prn";
import { fin } from "./dict/ru/fin";
import { dip } from "./dict/ru/dip";
import { tour } from "./dict/ru/tour";
import { admission } from "./dict/ru/admission";
import { cab } from "./dict/ru/cab";
import { sim } from "./dict/ru/sim";
import { vid } from "./dict/ru/vid";
import { res } from "./dict/ru/res";
import { ob } from "./dict/ru/ob";
import { sec } from "./dict/ru/sec";
import { ofs } from "./dict/ru/ofs";
import { ver } from "./dict/ru/ver";

export const ru: Dictionary = {
  commonSave: "Сохранить",
  commonCancel: "Отмена",
  commonError: "Произошла ошибка",
  commonLoading: "Загрузка...",
  commonNetworkError: "Ошибка сети. Попробуйте ещё раз.",
  commonLanguage: "Язык",
  commonLanguageHint: "Выберите язык интерфейса",

  authEmail: "Эл. почта",
  authPassword: "Пароль",
  authLoginLink: "Войти",
  authEmailPlaceholder: "email@ttpu.uz",
  authPasswordPlaceholder: "••••••••",
  authShowPassword: "Показать пароль",
  authHidePassword: "Скрыть пароль",
  authDemoTitle: "Демо-аккаунты",
  authDemoHint: "При нажатии демо-почта заполняется автоматически",
  authRoleStudent: "Студент",
  authRoleTeacher: "Преподаватель",
  authRoleAdmin: "Администратор",

  authLoginPanelTitle: "Учебный процесс на единой, быстрой и надёжной платформе",
  authLoginPanelSubtitle: "Курсы, оценки, расписание и посещаемость — в одном аккаунте, на всех устройствах.",
  authLoginFeature1: "Все дисциплины и материалы в одном месте",
  authLoginFeature2: "Оценки, GPA и официальный транскрипт",
  authLoginFeature3: "Расписание, посещаемость и напоминания в Telegram",
  authLoginStatStudents: "Студентов",
  authLoginStatCourses: "Дисциплин",
  authLoginStatSatisfaction: "Довольны",
  authLoginTitle: "Вход в систему",
  authLoginSubtitle: "Продолжите с аккаунтом FBSU",
  authLoginForgot: "Восстановить пароль",
  authLoginRemember: "Запомнить меня",
  authLoginError: "Не удалось войти",
  authLoginSubmitting: "Вход...",
  authLoginSubmit: "Войти",
  authLoginNoAccount: "Нет аккаунта?",
  authLoginRegister: "Регистрация",
  authLoginTerms: "Входя в систему, вы соглашаетесь с правилами использования университета.",

  authRegisterPanelTitle: "Создайте аккаунт за минуту и начните учиться",
  authRegisterPanelSubtitle: "Регистрация бесплатна и состоит из нескольких полей. Остальное платформа сделает сама.",
  authRegisterFeature1: "Личный кабинет и расписание откроются сразу",
  authRegisterFeature2: "GPA, оценки и транскрипт рассчитываются автоматически",
  authRegisterFeature3: "Все напоминания приходят через Telegram-бот",
  authRegisterStep1Title: "Аккаунт",
  authRegisterStep1Text: "Создаётся за 30 секунд",
  authRegisterStep2Title: "Профиль",
  authRegisterStep2Text: "Выбираются группа и факультет",
  authRegisterStep3Title: "Учёба",
  authRegisterStep3Text: "Курсы подключаются автоматически",
  authRegisterTitle: "Регистрация",
  authRegisterSubtitle: "Создайте новый аккаунт и начните учиться",
  authRegisterName: "Полное имя",
  authRegisterNamePlaceholder: "Имя Фамилия",
  authRegisterPasswordPlaceholder: "Минимум 12 символов",
  authRegisterError: "Ошибка при регистрации",
  authRegisterErrorName: "Введите полное имя (минимум 2 символа)",
  authRegisterErrorEmail: "Введите корректный адрес электронной почты",
  authRegisterErrorPassword: "Пароль должен содержать не менее 12 символов",
  authRegisterLoginPending: "Регистрация прошла успешно, но автоматический вход не выполнен. Войдите через страницу входа, используя свой пароль.",
  authRegisterSubmitting: "Создание...",
  authRegisterSubmit: "Создать аккаунт",
  authRegisterHasAccount: "Уже есть аккаунт?",
  authRegisterTerms: "Создавая аккаунт, вы соглашаетесь с условиями использования и политикой конфиденциальности.",

  authForgotTitle: "Восстановление пароля",
  authForgotSubtitle: "Введите адрес электронной почты, и мы отправим ссылку для восстановления",
  authForgotError: "Не удалось отправить запрос",
  authForgotSubmitting: "Отправка...",
  authForgotSubmit: "Отправить ссылку",
  authForgotRemember: "Помните пароль?",
  authForgotSentTitle: "Проверьте почту",
  authForgotSentBody: "Если {email} зарегистрирован, ссылка для сброса пароля отправлена. Ссылка действует 30 минут.",
  authForgotBack: "Вернуться на страницу входа",

  authResetInvalidTitle: "Ссылка недействительна",
  authResetInvalidBody: "Ссылка для сброса неполная или истекла. Запросите новую ссылку.",
  authResetNewLink: "Получить новую ссылку",
  authResetTitle: "Установка нового пароля",
  authResetSubtitle: "Введите надёжный пароль для своего аккаунта",
  authResetPasswordLabel: "Новый пароль",
  authResetPasswordPlaceholder: "Минимум 12 символов",
  authResetConfirmLabel: "Подтверждение пароля",
  authResetErrorShort: "Пароль должен содержать не менее 12 символов",
  authResetErrorMismatch: "Пароли не совпадают",
  authResetError: "Не удалось сбросить пароль",
  authResetDoneTitle: "Пароль обновлён",
  authResetDoneSubtitle: "Перенаправление на страницу входа...",
  authResetSubmitting: "Сохранение...",
  authResetSubmit: "Обновить пароль",

  certTitle: "Сертификат",
  certListTitle: "Сертификаты",
  certSubtitle: "Сертификат об окончании курса",
  certPresented: "Настоящий сертификат выдан",
  certGroupFormat: "Группа {group}",
  certCompletion: "за успешное окончание следующего курса",
  certResultFormat: "Результат: {score} баллов · {label}",
  certDate: "Дата",
  certCity: "город Ташкент",
  certOfficial: "Официальный документ",
  certSignature: "Подпись",
  certSerial: "Серийный номер",
  certIssuedVia: "Выдан через FBSU",
  certPrintHint: "Для сохранения в PDF или печати",
  certPrintButton: "Сохранить PDF / Печать",
  certGradeExcellent: "Отлично",
  certGradeGood: "Хорошо",
  certGradeSatisfactory: "Удовлетворительно",
  certGradeUnsatisfactory: "Неудовлетворительно",
  certGradeNone: "Без оценки",


  tchStudents: "чел.",
  tchAttendanceTitle: "Баллы за посещаемость",
  tchAttendanceSubtitle: "Отдельно для каждой группы — пришедший на занятие получает столько баллов",
  tchNoGroups: "Для этого курса группы не найдены",
  tchNoGroupTitle: "Без группы",
  tchNoGroupSubtitle: "Для студентов без группы",
  tchSave: "Сохранить",
  tchGivePointsSubtitle: "По выбранной категории и баллам",
  tchTotalForStudent: "Всего баллов у студента",
  tchHistory: "Выданные баллы",
  tchHistorySubtitle: "записей",

  settingsEyebrow: "Аккаунт",
  settingsTitle: "Настройки",
  settingsSubtitle: "Уведомления, интерфейс и связь",
  ...shell,
  ...dash,
  ...crs,
  ...sch,
  ...grd,
  ...msg,
  ...adm,
  ...msc,
  ...brd,
  ...lab,
  ...stf,
  ...tsk,
  ...acc,
  ...doc,
  ...prn,
  ...fin,
  ...dip,
  ...tour,
  ...admission,
  ...pay,
  ...cab,
  ...sim,
  ...vid,
  ...res,
  ...ob,
  ...fb,
  ...sec,
  ...ofs,
  ...ver,
};
