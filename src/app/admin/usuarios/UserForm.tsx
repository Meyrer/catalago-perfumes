"use client";

import { useActionState } from "react";
import { manageAdminUser } from "./actions";

type User = { id: number; username: string; name: string; email: string | null; active: boolean; mustChangePassword: boolean };
const inputClass = "mt-1 block w-full rounded-lg border border-brand-line bg-brand-card px-3 py-2 text-sm";
const buttonClass = "rounded-lg border border-brand-line px-3 py-2 text-sm font-semibold cursor-pointer hover:bg-brand-nude disabled:opacity-50";

export default function UserForm({ user, isSelf, canEmail }: { user?: User; isSelf?: boolean; canEmail?: boolean }) {
  const [result, action, pending] = useActionState(manageAdminUser.bind(null, user?.id ?? null), {});

  return (
    <div className={user ? "space-y-3 rounded-xl border border-brand-line bg-brand-card p-4" : "mt-4 space-y-3"}>
      {user && <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">@{user.username}{isSelf && <span className="ml-2 text-xs font-normal text-brand-muted">Você</span>}</h2>
        <p className="text-xs text-brand-muted">{!user.active ? "Desativado" : user.mustChangePassword ? "Aguardando definição de senha" : "Ativo"}</p>
      </div>}
      <form action={action} className="space-y-3">
        <div className={user ? "grid gap-3 sm:grid-cols-2" : "grid gap-3 sm:grid-cols-3"}>
          {!user && <label className="text-sm font-medium">Usuário<input name="username" autoComplete="off" className={inputClass} required minLength={3} maxLength={40} pattern="[a-zA-Z0-9._\x2d]+" /></label>}
          <label className="text-sm font-medium">Nome<input name="name" className={inputClass} defaultValue={user?.name} required maxLength={100} /></label>
          <label className="text-sm font-medium">E-mail<input name="email" type="email" className={inputClass} defaultValue={user?.email ?? ""} maxLength={254} /></label>
        </div>
        <button name="operation" value="save" type="submit" disabled={pending} className={buttonClass}>{user ? "Salvar alterações" : "Criar usuário"}</button>
      </form>
      {user && <form action={action} className="flex flex-wrap gap-2">
        {user.active && <>
          <button name="operation" value="link" type="submit" disabled={pending} className={buttonClass}>Gerar link de senha</button>
          {canEmail && user.email && <button name="operation" value="email" type="submit" disabled={pending} className={buttonClass}>Enviar link por e-mail</button>}
        </>}
        {!isSelf && <button name="operation" value={user.active ? "deactivate" : "activate"} type="submit" disabled={pending} className={buttonClass}>{user.active ? "Desativar acesso" : "Reativar acesso"}</button>}
      </form>}
      {result.error && <p role="alert" className="text-sm text-red-700">{result.error}</p>}
      {result.message && <p role="status" className="text-sm text-brand-muted">{result.message}</p>}
      {result.link && <label className="block text-sm font-medium">Link de redefinição<input className={inputClass} value={result.link} readOnly onFocus={event => event.currentTarget.select()} /></label>}
    </div>
  );
}
