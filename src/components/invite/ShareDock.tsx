"use client";

import { useState, type ReactNode } from "react";
import { Image as GalleryIcon } from "lucide-react";
import { InstagramGlyph, TelegramGlyph, WhatsAppGlyph } from "@/components/invite/BrandIcons";
import { downloadBlob, renderQrPng, type QrModel } from "@/components/invite/qr";
import { toast } from "@/components/ui/Toast";
import { PROTOCOL } from "@/config/protocol";
import { copyText } from "@/lib/clipboard";
import { useT } from "@/lib/i18n";

const INSTAGRAM_URL = "https://www.instagram.com/";
const ITEM =
  "flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-2xl py-1 outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-gray-900";
const CIRCLE = "flex h-[52px] w-[52px] items-center justify-center rounded-full";

function Label({ children }: { children: ReactNode }) {
  return <span className="text-xs font-medium text-gray-600">{children}</span>;
}

interface Props {
  model: QrModel;
  code: string;
  link: string;
}

export function ShareDock({ model, code, link }: Props) {
  const { t } = useT();
  const [saving, setSaving] = useState(false);
  const message = t("invite.share.text", { brand: PROTOCOL.name, code });
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${message} ${link}`)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`;

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const blob = await renderQrPng(model, code, t("invite.share.caption", { brand: PROTOCOL.name }));
      downloadBlob(blob, `${PROTOCOL.shortName.toLowerCase()}-invite-${code}.png`);
      toast.success(t("invite.share.saved"));
    } catch {
      toast.error(t("invite.share.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  // Instagram has no web share intent: use the native sheet when there is one, else hand over the link.
  const shareInstagram = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: PROTOCOL.name, text: message, url: link });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    window.open(INSTAGRAM_URL, "_blank", "noopener,noreferrer");
    if (await copyText(link)) toast.success(t("invite.share.instagramCopied"));
    else toast.error(t("invite.copyFailed"));
  };

  const via = (app: string) => t("invite.share.via", { app });

  return (
    <nav aria-label={t("invite.share.label")} className="relative z-10 mx-4 mt-4 flex items-start justify-around gap-1 rounded-3xl bg-white p-4 shadow-lg">
      <button type="button" onClick={save} disabled={saving} data-testid="share-download" aria-label={t("invite.share.saveAria")} className={ITEM}>
        <span className={`${CIRCLE} bg-gray-100 text-gray-900`}>
          <GalleryIcon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </span>
        <Label>{t("invite.share.save")}</Label>
      </button>

      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" data-testid="share-whatsapp" aria-label={via(t("invite.share.whatsapp"))} className={ITEM}>
        <span className={`${CIRCLE} bg-[#25D366]`}>
          <WhatsAppGlyph className="h-7 w-7" />
        </span>
        <Label>{t("invite.share.whatsapp")}</Label>
      </a>

      <a href={telegramUrl} target="_blank" rel="noopener noreferrer" data-testid="share-telegram" aria-label={via(t("invite.share.telegram"))} className={ITEM}>
        <span className={`${CIRCLE} bg-[#229ED9]`}>
          <TelegramGlyph className="h-7 w-7" />
        </span>
        <Label>{t("invite.share.telegram")}</Label>
      </a>

      <button type="button" onClick={shareInstagram} data-testid="share-instagram" aria-label={via(t("invite.share.instagram"))} className={ITEM}>
        <span className={`${CIRCLE} bg-[radial-gradient(circle_at_30%_107%,#fdf497_0%,#fdf497_5%,#fd5949_45%,#d6249f_60%,#285AEB_90%)]`}>
          <InstagramGlyph className="h-7 w-7" />
        </span>
        <Label>{t("invite.share.instagram")}</Label>
      </button>
    </nav>
  );
}
