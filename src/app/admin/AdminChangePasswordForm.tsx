"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ShieldAlert, ArrowRight, LogOut } from "lucide-react";
import { changeAdminPasswordAction, logoutAdminAction } from "../actions";
import type { AdminSessionUser } from "@/lib/auth";

type Props = {
  user: AdminSessionUser;
};

export default function AdminChangePasswordForm({ user }: Props) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const calculateStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "", color: "" };
    let s = 0;
    if (pass.length >= 6) s += 1;
    if (pass.length >= 8) s += 1;
    if (/[A-Z]/.test(pass)) s += 1;
    if (/[0-9]/.test(pass)) s += 1;
    if (/[^A-Za-z0-9]/.test(pass)) s += 1;

    if (s <= 2) return { score: 1, label: "Fraca (adicione números ou símbolos)", color: "bg-red-500" };
    if (s <= 3) return { score: 2, label: "Média (boa)", color: "bg-amber-500" };
    return { score: 3, label: "Forte (excelente proteção)", color: "bg-emerald-500" };
  };

  const strength = calculateStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("A nova senha deve conter no mínimo 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("A confirmação de senha não coincide com a nova senha.");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("newPassword", newPassword);
      formData.append("confirmPassword", confirmPassword);

      const res = await changeAdminPasswordAction(formData);

      if (!res.success) {
        setError(res.error || "Não foi possível alterar a senha.");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      setError("Erro de conexão ao salvar a nova senha. Tente novamente.");
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logoutAdminAction();
      window.location.reload();
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] flex flex-col justify-center items-center p-4 sm:p-6 text-[#09090b]">
      {/* Container Principal */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#dcd5c7] shadow-xl p-6 sm:p-8 relative overflow-hidden">
        
        {/* Barra superior decorativa */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7a5828] via-[#a37941] to-[#7a5828]" />

        {/* Header do Card */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-[#7a5828] text-[11px] font-bold uppercase tracking-wider mb-3">
            <ShieldAlert size={14} className="text-amber-600" />
            Primeiro Acesso Obrigatório
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#09090b] tracking-tight">
            Olá, {user.name}!
          </h1>
          <p className="text-xs text-[#52525b] mt-1.5 leading-relaxed font-medium">
            Por motivos de segurança, crie sua <strong>nova senha pessoal</strong> antes de acessar o painel administrativo.
          </p>
        </div>

        {/* Alerta de Erro */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Alerta de Sucesso */}
        {success && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>Senha alterada com sucesso! Entrando no painel...</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Usuário Ativo */}
          <div>
            <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1.5">
              Conta de Acesso
            </label>
            <div className="w-full bg-[#f4efe6] px-3.5 py-2.5 rounded-xl border border-[#dcd5c7] text-xs font-bold text-[#09090b]">
              {user.name} (@{user.username})
            </div>
          </div>

          {/* Nova Senha */}
          <div>
            <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1.5">
              Nova Senha Pessoal
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#52525b]">
                <Lock size={15} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                disabled={isLoading || success}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite sua nova senha"
                className="w-full pl-10 pr-10 py-2.5 bg-[#f4efe6] focus:bg-white text-xs text-[#09090b] font-medium rounded-xl border border-[#dcd5c7] focus:border-[#7a5828] outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#52525b] hover:text-[#09090b] cursor-pointer"
                title={showPassword ? "Ocultar senha" : "Exibir senha"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Medidor de Força */}
            {newPassword.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  <div className={`h-1 flex-1 rounded-full ${strength.score >= 1 ? strength.color : 'bg-[#e5ded4]'}`} />
                  <div className={`h-1 flex-1 rounded-full ${strength.score >= 2 ? strength.color : 'bg-[#e5ded4]'}`} />
                  <div className={`h-1 flex-1 rounded-full ${strength.score >= 3 ? strength.color : 'bg-[#e5ded4]'}`} />
                </div>
                <p className="text-[10px] text-[#52525b] font-medium">
                  Força: {strength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirmar Nova Senha */}
          <div>
            <label className="block text-[11px] font-bold text-[#52525b] uppercase tracking-wider mb-1.5">
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#52525b]">
                <Lock size={15} />
              </div>
              <input
                type={showConfirm ? "text" : "password"}
                required
                disabled={isLoading || success}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full pl-10 pr-10 py-2.5 bg-[#f4efe6] focus:bg-white text-xs text-[#09090b] font-medium rounded-xl border border-[#dcd5c7] focus:border-[#7a5828] outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#52525b] hover:text-[#09090b] cursor-pointer"
                title={showConfirm ? "Ocultar senha" : "Exibir senha"}
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[10px] text-red-600 mt-1 font-semibold">
                As senhas não conferem.
              </p>
            )}
            {confirmPassword && newPassword === confirmPassword && (
              <p className="text-[10px] text-emerald-700 mt-1 font-semibold flex items-center gap-1">
                <CheckCircle2 size={12} /> Senhas conferem!
              </p>
            )}
          </div>

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={isLoading || success}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-[#09090b] hover:bg-[#27272a] text-white text-xs font-bold tracking-wide transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin text-[#a37941]" />
                <span>Atualizando senha...</span>
              </>
            ) : success ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>Senha Atualizada!</span>
              </>
            ) : (
              <>
                <span>Salvar Nova Senha e Entrar</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Rodapé do Card */}
        <div className="mt-6 pt-4 border-t border-[#dcd5c7] text-center flex items-center justify-between text-xs">
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="text-[#52525b] hover:text-red-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut size={13} /> Sair / Trocar de Usuário
          </button>
          <span className="text-[10px] text-[#71717a]">
            Elegance Admin v2.0
          </span>
        </div>
      </div>
    </div>
  );
}
