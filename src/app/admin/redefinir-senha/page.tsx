"use client";

import Link from "next/link";
import { useActionState } from "react";
import { redeemAdminPasswordLink } from "./action";

type ResetState = { error?: string; success?: boolean };
const fieldClass = "mt-1 block w-full rounded-lg border border-brand-line bg-brand-card px-3 py-2";

export default function ResetAdminPasswordPage() {
  const [state, submit, pending] = useActionState(async (_previous: ResetState, form: FormData): Promise<ResetState> => {
    try {
      const result = await redeemAdminPasswordLink(window.location.hash.slice(1), String(form.get("password") ?? ""), String(form.get("confirmation") ?? ""));
      if (result.success) window.history.replaceState(null, "", window.location.pathname);
      return result;
    } catch {
      return { error: "Não foi possível redefinir a senha. Tente novamente." };
    }
  }, {});

  return (
    <main className="grid min-h-screen place-items-center bg-brand-cream p-4 text-brand-chocolate">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-brand-line bg-brand-card p-6">
        <h1 className="text-xl font-bold">Definir senha do painel</h1>
        {state.success ? <p role="status" className="text-sm">Senha salva. Entre no painel com a nova senha.</p> : (
          <form action={submit} className="space-y-4">
            <p className="text-sm text-brand-muted">Use pelo menos 12 caracteres.</p>
            {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
            <label className="block text-sm font-medium">Nova senha<input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" className={fieldClass} /></label>
            <label className="block text-sm font-medium">Confirmar senha<input name="confirmation" type="password" required minLength={12} maxLength={128} autoComplete="new-password" className={fieldClass} /></label>
            <button type="submit" disabled={pending} className="w-full rounded-lg bg-brand-chocolate px-3 py-2 text-sm font-semibold text-brand-cream disabled:opacity-50">{pending ? "Salvando…" : "Salvar nova senha"}</button>
          </form>
        )}
        <Link href="/admin" className="inline-block text-sm font-semibold underline">Voltar ao login</Link>
      </div>
    </main>
  );
}
