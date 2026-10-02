interface IconProps {
  className?: string;
}

export function TelegramIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <circle cx="12" cy="12" r="12" fill="#229ED9" />
      <path
        fill="#fff"
        d="M5.1 11.7 17.6 6.7c.9-.3 1.7.2 1.5 1.2l-2.1 9.3c-.2 1-.8 1.2-1.6.7l-3.2-2.4-1.6 1.5c-.2.2-.4.3-.7.3l.3-3.3 6-5.4c.3-.2-.1-.4-.4-.2L7.8 13.1l-2.6-.9c-.9-.3-.9-.4-.1-.5Z"
      />
    </svg>
  );
}

export function GoogleIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.9-6.9C35.9 2.4 30.5 0 24 0 14.6 0 6.5 5.4 2.6 13.2l8 6.2C12.4 13.7 17.7 9.5 24 9.5Z"
      />
      <path
        fill="#4285F4"
        d="M47 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.9c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 7.2-10.4 7.2-17.6Z"
      />
      <path fill="#FBBC05" d="M10.5 28.6a14.5 14.5 0 0 1 0-9.2l-8-6.2a24 24 0 0 0 0 21.6l8-6.2Z" />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.4-4.9 2.3-8.2 2.3-6.3 0-11.6-4.2-13.5-9.9l-8 6.2C6.5 42.6 14.6 48 24 48Z"
      />
    </svg>
  );
}

/** Wallet outline in soft cyan. */
export function WalletIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#22B8CF"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H17a2 2 0 0 1 2 2v1.5" />
      <path d="M4 7.5v9A2.5 2.5 0 0 0 6.5 19H18a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 1 4 7.5Z" />
      <circle cx="15.5" cy="14" r="1.1" fill="#22B8CF" stroke="none" />
    </svg>
  );
}
