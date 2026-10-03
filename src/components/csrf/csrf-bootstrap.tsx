"use client";

import { useEffect } from "react";
import { installCsrfFetch } from "@/lib/csrf-client";

export function CsrfBootstrap() {
  useEffect(() => installCsrfFetch(), []);
  return null;
}