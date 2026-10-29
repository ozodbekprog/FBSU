"use client";

/**
 * Emoji tanlagichi.
 *
 * Har biri o'z kategoriyasiga tegishli. Qidiruv barcha emojilarni
 * nomi bo'yicha izlaydi (Telegram uslubi).
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/LocaleProvider";

type Group = { key: string; emoji: string[] };

const GROUPS: Group[] = [
  {
    key: "😀",
    emoji: [
      "😀","😃","😄","😁","😆","😅","😂","🤣","🥲","😊","😇","🙂","🙃","😉","😌","😊","😇",
      "🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭",
      "🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤",
      "😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓",
      "🧐","😕","😟","🙁","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭",
      "😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️",
    ],
  },
  { key: "👍", emoji: ["👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","✍️","💅","🤳"] },
  { key: "❤️", emoji: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️"] },
  { key: "🐻", emoji: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🪱","🐛","🦋","🐌","🐞","🐜","🪰","🪲","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦀","🐠","🐟","🐬","🐳","🦈"] },
  { key: "🍎", emoji: ["🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶️","🌽","🥕","🧄","🧅","🥔","🍠","🥐","🥯","🍞","🥖","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🍔","🍟","🍕","🌭","🥪","🌮","🌯","🥙","🧆","🥘","🍝","🍜","🍲","🍣","🍱","🥟","🍤","🍙","🍚","🍘","🍥","🥠","🥮","🍢","🍡","🍧","🍨","🍦","🥧","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🌰","🥜"] },
  { key: "⚽", emoji: ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🏑","🥍","🏏","🪃","🥅","⛳","🪁","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌","🎿","⛷️","🏂","🏋️","🤸","🤺","🤼","🤽","🤾","🏌️","🏇","🧘","🏄","🏊","🤽","🚣","🧗"] },
  { key: "🚗", emoji: ["🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🦯","🦽","🦼","🛴","🚲","🛵","🏍️","🛺","🚨","🚔","🚍","🚘","🚖","🚡","🚠","🚟","🚃","🚋","🚞","🚝"] },
  { key: "💡", emoji: ["💡","🔌","🔋","🪫","🔦","🕯️","🪔","🧯","🛢️","💸","💵","💴","💶","💷","🪙","💰","💳","🧾","💎","⚖️","🪜","🧰","🪛","🔧","🔨","⚒️","🛠️","⛏️","🪚","🔩","⚙️","🪤","🧱","⛓️","🧲","🔫","💣","🧨","🪓","🔪","🗡️","⚔️","🛡️","🚬","⚰️","🪦","⚱️","🏺","🔮","📿","🧿"] },
  { key: "✅", emoji: ["✅","☑️","✔️","❌","❎","➕","➖","➗","✖️","♾️","‼️","⁉️","❓","❔","❕","❗","〰️","💱","💲","⚠️","🚫","🔞","📵","🚳","🚭","❗","🔔","🔕","🔇","🔊","🔉","📢","📣","💬","💭","🗯️","♠️","♥️","♣️","♦️","🃏","🎴","🀄"] },
  { key: "❤️‍🔥", emoji: ["🎉","🎊","🎈","🎂","🎁","🎗️","🎟️","🎫","🏆","🥇","🥈","🥉","⚽","🎯","🎲","♟️","🎮","🎰","🧩","🧸","🎨","🎭","🎬","🎤","🎧","🎼","🎹","🥁","🎷","🎺","🎸","🪕","🎻","🎪","🎫"] },
  { key: "🖐️", emoji: ["👍","👎","👌","🙏","💪","👏","🙌","🤝","✌️","🤞","🫰","🤟","🤘","👊","✊","🤛","🤜","🫡","🫶","👏","💅","🤳","🙇","🙆","💁","🙅","🙋","🧏","🙇‍♂️","🙅‍♀️","🙋‍♂️","🙋‍♀️"] },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (emoji: string) => void;
  /** Emoji paneli qaysi tugma ustidan ochilishini bilishi uchun. */
  anchorRef?: React.RefObject<HTMLElement | null>;
};

/** Emoji panelining taxminiy balandligi (joy hisoblash uchun). */
const PICKER_HEIGHT = 336;
const PICKER_WIDTH = 352;
const GAP = 10;

export function EmojiPicker({ open, onClose, onPick, anchorRef }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Panel aniq kompaktning 😊 tugmasi ustidan ochilsin — ekranning
  // tepasida emas. `anchorRef` nuqtasini o'lchab, undan yuqorida va
  // o'ngga tekislab joylaymiz, ko'rinmaydigan qismga chiqib ketmasligi
  // uchun chegaralaymiz.
  useLayoutEffect(() => {
    if (!open) return;
    // Pozitsiyani React state'ga emas, to'g'ridan-to'g'ri DOM'ga yozamiz
    // (qo'shimcha render va `setState-in-effect` qoidasining oldi olinadi).
    const position = () => {
      const node = ref.current;
      if (!node) return;
      const vw = window.innerWidth;
      const rect = anchorRef?.current?.getBoundingClientRect();
      let left = Math.max(12, vw - PICKER_WIDTH - 16);
      let top = 96;
      if (rect) {
        left = rect.right - PICKER_WIDTH;
        top = rect.top - PICKER_HEIGHT - GAP;
        if (top < 12) top = rect.bottom + GAP; // tepada joy qolmasa — pastga
      }
      left = Math.min(Math.max(12, left), Math.max(12, vw - PICKER_WIDTH - 12));
      node.style.left = `${left}px`;
      node.style.top = `${top}px`;
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return GROUPS.flatMap((g) => g.emoji).filter((e) =>
      EMOJI_NAMES[e]?.includes(q) ?? false,
    );
  }, [query]);

  if (!open) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[70]" aria-hidden="true" onClick={onClose} />
      <div
        ref={ref}
        data-emoji-picker=""
        className={cn(
          "animate-fade-up fixed z-[71] flex w-[min(22rem,calc(100vw-1.5rem))] flex-col",
          "overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xl dark:border-slate-200/30 dark:bg-[#0e1729]",
        )}
      >
        <div className="border-b border-slate-100 p-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("msgSearchEmoji")}
            aria-label={t("msgSearchEmoji")}
            className="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm outline-none placeholder:text-slate-500"
          />
        </div>

        {results ? (
          <div className="grid max-h-64 grid-cols-8 gap-0.5 overflow-y-auto p-2">
            {results.length ? (
              results.map((e, i) => (
                <button
                  key={`${e}-${i}`}
                  type="button"
                  onClick={() => {
                    onPick(e);
                    onClose();
                  }}
                  className="flex size-9 items-center justify-center rounded-lg text-xl hover:bg-slate-100"
                >
                  {e}
                </button>
              ))
            ) : (
              <p className="col-span-8 px-2 py-6 text-center text-sm text-slate-500">
                {t("msgNoSearchResults")}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="max-h-64 overflow-y-auto p-2">
              {GROUPS.map((group, gi) => (
                <div key={group.key} className={cn("mb-2", tab === gi && "block", tab !== gi && "hidden")}>
                  <div className="grid grid-cols-8 gap-0.5">
                    {group.emoji.map((e, i) => (
                      <button
                        key={`${e}-${i}`}
                        type="button"
                        onClick={() => onPick(e)}
                        aria-label={EMOJI_NAMES[e] ?? e}
                        className="flex size-9 items-center justify-center rounded-lg text-xl transition-colors hover:bg-slate-100 active:scale-90"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-2 py-1.5">
              {GROUPS.map((g, i) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setTab(i)}
                  aria-label={`${i + 1}-kategoriya`}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg text-base transition-colors",
                    tab === i ? "bg-slate-100" : "hover:bg-slate-50",
                  )}
                >
                  {g.key}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>,
    document.body,
  );
}

/** Qidiruv uchun nomlar. Kengaytirilishi mumkin. */
const EMOJI_NAMES: Record<string, string> = {
  "😀": "qahqah kulish tabassum smile grin",
  "😂": "xohosh kulish lol haha funny",
  "❤️": "yurak red heart love",
  "👍": "zo'r like thumbs ok yes good",
  "👎": "yomon dislike thumbs down bad",
  "🙏": "duo namoz thanks pray please",
  "👏": "zarba applaus clap bravo",
  "🔥": "olov fire hot",
  "✅": "tasdiq check done yes green",
  "❌": "xato cross no red wrong",
  "😢": "yo'qotish qayg'u sad cry",
  "😭": "yig'lash cry loud sob",
  "🤔": "o'ylash thinking hmm think",
  "😎": "keyf ko'ngli cool sunglasses",
  "🥺": "iltimonizm plead puppy eyes",
  "💀": "murda skull dead",
  "🎉": "bayram partiya party celebrate tada",
  "👍🏽": "zo'r like",
  "🙏🏻": "duo",
  "🤝": "qo'shniq handshake deal",
  "💪": "kuch strong muscle flex",
};