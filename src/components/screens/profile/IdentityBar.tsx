"use client";

import { Copy, Eye, EyeOff } from "lucide-react";
import { BellButton } from "@/components/ui/BellButton";
import { NexusMark } from "@/components/ui/NexusMark";
import { toast } from "@/components/ui/Toast";
import { copyText } from "@/lib/clipboard";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";

const ICON_BUTTON =
  "-my-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 outline-none transition-transform active:scale-90 focus-visible:ring-2 focus-visible:ring-gray-900";

interface Props {
  hidden: boolean;
  onToggle: () => void;
}

/** Logo, name with the show/hide eye, copyable ID, and the notification bell. */
export function IdentityBar({ hidden, onToggle }: Props) {
  const { t } = useT();
  const user = useAppStore((s) => s.user);

  const copyId = async () => {
    if (await copyText(user.uid)) toast.success(t("profile.idCopied"));
    else toast.error(t("profile.copyFailed"));
  };

  return (
    <header aria-label={t("profile.identity")} className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <NexusMark className="h-12 w-12 shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-0.5">
            <h1 data-testid="profile-name" className="min-w-0 truncate text-lg font-bold leading-tight text-gray-900">
              {user.isGuest ? t("profile.guest") : user.displayName}
            </h1>
            <button
              type="button"
              onClick={onToggle}
              aria-pressed={hidden}
              aria-label={hidden ? t("profile.showBalances") : t("profile.hideBalances")}
              data-testid="profile-eye"
              className={ICON_BUTTON}
            >
              {hidden ? <EyeOff className="h-[18px] w-[18px]" aria-hidden /> : <Eye className="h-[18px] w-[18px]" aria-hidden />}
            </button>
          </div>
          {user.isGuest ? (
            <p className="text-[13px] text-fg-muted">{t("profile.notSignedIn")}</p>
          ) : (
            <div className="flex items-center gap-0.5 text-[13px] text-fg-muted">
              <span data-testid="profile-uid" className="whitespace-nowrap font-mono tabular-nums">
                {t("profile.id")}: {user.uid}
              </span>
              <button type="button" onClick={copyId} aria-label={t("profile.copyId")} data-testid="profile-copy-id" className={ICON_BUTTON}>
                <Copy className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
        </div>
      </div>
      <BellButton />
    </header>
  );
}
