"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, FlaskConical, Loader2 } from "lucide-react";
import { Field, PasswordField, inputClass } from "@/components/auth/fields";
import { Switch } from "@/components/ui/Switch";
import { toast } from "@/components/ui/Toast";
import { AUTH } from "@/config/protocol";
import { AUTH_PROCESSING_MS, wait } from "@/lib/async";
import { parseIdentifier } from "@/lib/identifiers";
import { useAppStore } from "@/lib/store";
import type { AuthTab } from "@/types/domain";

const TAP = { scale: 0.98 } as const;
const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

interface Props {
  identifier: string;
  setIdentifier: (value: string) => void;
  onSwitch: (tab: AuthTab) => void;
}

export function LoginForm({ identifier, setIdentifier, onSwitch }: Props) {
  const login = useAppStore((s) => s.login);
  const demoLogin = useAppStore((s) => s.demoLogin);

  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState<"login" | "demo" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = parseIdentifier(identifier);
  const idError = submitted && !parsed.ok ? parsed.error : null;
  const pwError = submitted && !password ? "Enter your password." : null;

  const submit = async () => {
    if (busy) return;
    setSubmitted(true);
    setError(null);
    if (!parsed.ok || !password) return;
    setBusy("login");
    await wait(AUTH_PROCESSING_MS);
    const result = await login({ identifier, password, remember });
    setBusy(null);
    if (result.ok) toast.success("Signed in");
    else setError(result.error);
  };

  const demo = async () => {
    if (busy) return;
    setError(null);
    setBusy("demo");
    await wait(AUTH_PROCESSING_MS);
    const result = await demoLogin();
    setBusy(null);
    if (result.ok) toast.success("Signed in to the demo account");
    else setError(result.error);
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <Field id="login-identifier" label="Email or phone" error={idError}>
        <input
          id="login-identifier"
          type="text"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Email or phone number"
          value={identifier}
          onChange={(event) => {
            setIdentifier(event.target.value);
            setError(null);
          }}
          aria-invalid={Boolean(idError)}
          aria-describedby={idError ? "login-identifier-error" : undefined}
          className={inputClass(Boolean(idError))}
        />
      </Field>

      <PasswordField
        id="login-password"
        label="Password"
        value={password}
        onChange={(value) => {
          setPassword(value);
          setError(null);
        }}
        autoComplete="current-password"
        error={pwError}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Switch checked={remember} onChange={setRemember} label="Remember this device" />
          <span className="min-w-0 text-xs">
            <span className="block font-semibold text-slate-800">Remember this device</span>
            <span className="block text-slate-500">{remember ? "Stay signed in here" : "Sign out when the browser closes"}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => onSwitch("forgot")}
          className="shrink-0 rounded-md text-xs font-semibold text-slate-700 underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          Forgot Password?
        </button>
      </div>

      {error && (
        <p role="alert" data-testid="auth-error" className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      )}

      <motion.button
        type="submit"
        whileTap={busy ? undefined : TAP}
        transition={SPRING}
        disabled={busy !== null}
        aria-busy={busy === "login"}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:bg-slate-300"
      >
        {busy === "login" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Signing in…
          </>
        ) : (
          "Sign In to Terminal"
        )}
      </motion.button>

      <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-slate-400" aria-hidden>
        <span className="h-px flex-1 bg-slate-200" />
        Sandbox
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div>
        <motion.button
          type="button"
          whileTap={busy ? undefined : TAP}
          transition={SPRING}
          onClick={demo}
          disabled={busy !== null}
          aria-busy={busy === "demo"}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 py-3 text-sm font-semibold text-amber-900 outline-none transition-colors hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {busy === "demo" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FlaskConical className="h-4 w-4" aria-hidden />}
          Demo Login (Preloaded VIP 2 Account)
        </motion.button>
        <p className="mt-2 text-center text-[11px] text-slate-500">
          Or sign in with <span className="font-mono">{AUTH.demo.identifier}</span> · <span className="font-mono">{AUTH.demo.password}</span>
        </p>
      </div>

      <p className="text-center text-xs text-slate-500">
        New here?{" "}
        <button
          type="button"
          onClick={() => onSwitch("register")}
          className="rounded-md font-semibold text-slate-900 underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          Create an account
        </button>
      </p>
    </form>
  );
}
