import type { Dictionary } from "@/i18n";

export const ORDER_TYPES = ["TRANSCRIPT", "CERTIFICATE", "RETAKE", "OTHER"] as const;

export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_STATUSES = ["NEW", "IN_PROGRESS", "DONE", "REJECTED"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderStatusTone = "blue" | "amber" | "green" | "rose";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: "Yangi",
  IN_PROGRESS: "Jarayonda",
  DONE: "Bajarildi",
  REJECTED: "Rad etildi",
};

export const ORDER_STATUS_TONE: Record<OrderStatus, OrderStatusTone> = {
  NEW: "blue",
  IN_PROGRESS: "amber",
  DONE: "green",
  REJECTED: "rose",
};

export const ORDER_STATUS_DOT: Record<OrderStatus, string> = {
  NEW: "bg-brand-400",
  IN_PROGRESS: "bg-amber-400",
  DONE: "bg-emerald-400",
  REJECTED: "bg-rose-400",
};

export function isOrderType(value: string): value is OrderType {
  return (ORDER_TYPES as readonly string[]).includes(value);
}

export type TranslateFn = (
  key: keyof Dictionary,
  params?: Record<string, string | number>,
) => string;

export function orderLabels(t: TranslateFn): {
  type: Record<OrderType, string>;
  typeHint: Record<OrderType, string>;
  status: Record<OrderStatus, string>;
  statusHint: Record<OrderStatus, string>;
} {
  return {
    type: {
      TRANSCRIPT: t("mscOrderTypeTranscript"),
      CERTIFICATE: t("mscOrderTypeCertificate"),
      RETAKE: t("mscOrderTypeRetake"),
      OTHER: t("mscOrderTypeOther"),
    },
    typeHint: {
      TRANSCRIPT: t("mscOrderTypeHintTranscript"),
      CERTIFICATE: t("mscOrderTypeHintCertificate"),
      RETAKE: t("mscOrderTypeHintRetake"),
      OTHER: t("mscOrderTypeHintOther"),
    },
    status: {
      NEW: t("mscOrderStatusNew"),
      IN_PROGRESS: t("mscOrderStatusInProgress"),
      DONE: t("mscOrderStatusDone"),
      REJECTED: t("mscOrderStatusRejected"),
    },
    statusHint: {
      NEW: t("mscOrderStatusHintNew"),
      IN_PROGRESS: t("mscOrderStatusHintInProgress"),
      DONE: t("mscOrderStatusHintDone"),
      REJECTED: t("mscOrderStatusHintRejected"),
    },
  };
}

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function toOrderType(value: string): OrderType {
  return isOrderType(value) ? value : "OTHER";
}

export function toOrderStatus(value: string): OrderStatus {
  return isOrderStatus(value) ? value : "NEW";
}
