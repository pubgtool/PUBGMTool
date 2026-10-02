interface GlyphProps {
  className?: string;
}

export function WhatsAppGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3z" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
      <path
        d="M9.3 7.4c.2-.5.7-.6 1.1-.4l.9.5c.4.3.6.8.3 1.2l-.5.7c-.1.2-.1.4 0 .6.7 1.2 1.6 2 2.7 2.7.2.1.4.1.6 0l.7-.5c.4-.3.9-.2 1.2.2l.6.9c.3.4.2.9-.2 1.2-.7.6-1.6.8-2.5.5-2.8-.9-5-3.1-5.9-5.9-.2-.9 0-1.7.5-2.2z"
        fill="#fff"
      />
    </svg>
  );
}

export function TelegramGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M21.2 4.3 3.6 11.1c-1.2.5-1.2 1.2-.2 1.5l4.5 1.4 1.7 5.3c.2.6.4.8.8.8.5 0 .7-.2 1-.5l2.2-2.1 4.6 3.4c.8.5 1.5.2 1.7-.8l3-14.1c.2-1.1-.5-1.9-1.7-1.7z"
        fill="#fff"
      />
      <path d="M9.4 13.8l8.2-5.2c.4-.2.7 0 .4.3l-6.7 6.1-.3 3.2z" fill="#229ED9" />
    </svg>
  );
}

export function InstagramGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="#fff" stroke="none" />
    </svg>
  );
}
