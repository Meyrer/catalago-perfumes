"use client";

import { useState } from "react";
import { loginAdminAction } from "../actions";
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Por favor, informe o seu usuário.");
      return;
    }
    if (!password.trim()) {
      setError("Por favor, informe a senha de acesso.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("username", username.trim());
      formData.set("password", password);

      const res = await loginAdminAction(formData);

      if (!res.success) {
        setError(res.error || "Usuário ou senha incorretos.");
      } else {
        window.location.reload();
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Ocorreu um erro ao processar o login. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-brand-nude selection:text-brand-chocolate">
      {/* Botão de retorno ao catálogo */}
      <div className="w-full max-w-md mb-6 flex justify-start">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-brand-muted hover:text-brand-chocolate transition-colors py-1.5 px-3 rounded-full hover:bg-brand-card border border-transparent hover:border-brand-line"
        >
          <ArrowLeft size={15} /> Voltar à loja pública
        </Link>
      </div>

      {/* Card Principal de Login */}
      <div className="w-full max-w-md bg-brand-card rounded-3xl border-2 border-brand-line shadow-xl p-7 sm:p-10 relative overflow-hidden">
        {/* Detalhe superior em bronze */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-caramel via-brand-caramel to-brand-caramel" />

        {/* Cabeçalho da Marca */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-brand-cream border-1.5 border-brand-line flex items-center justify-center text-brand-muted shadow-xs">
            <ShieldCheck size={28} />
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif tracking-[0.16em] font-medium text-brand-chocolate">
            PERFUMIO
          </h1>
          <p className="text-[10px] uppercase tracking-[0.25em] text-brand-muted font-bold mt-1">
            Painel Administrativo
          </p>
          <p className="text-xs text-brand-muted mt-2 font-medium">
            Área restrita de gestão de produtos, estoque e custos.
          </p>
        </div>

        {/* Formulário de Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-brand-rose-beige border border-brand-terracotta text-brand-chocolate text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200 font-medium">
              <AlertCircle size={16} className="text-brand-chocolate shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="admin-username"
              className="block text-xs font-bold text-brand-chocolate uppercase tracking-wider mb-1.5"
            >
              Usuário
            </label>
            <div className="relative flex items-center">
              <User size={16} className="absolute left-3.5 text-brand-muted pointer-events-none" />
              <input
                id="admin-username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-brand-card border-2 border-brand-line rounded-xl text-sm font-semibold text-brand-chocolate outline-none focus:border-brand-chocolate focus:ring-4 focus:ring-brand-chocolate/5 transition-all"
                placeholder="Ex: Meyrer ou Felipe"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-bold text-brand-chocolate uppercase tracking-wider mb-1.5"
            >
              Senha
            </label>
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-3.5 text-brand-muted pointer-events-none" />
              <input
                id="admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                className="w-full pl-10 pr-11 py-2.5 bg-brand-card border-2 border-brand-line rounded-xl text-sm font-semibold text-brand-chocolate outline-none focus:border-brand-chocolate focus:ring-4 focus:ring-brand-chocolate/5 transition-all"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1 text-brand-muted hover:text-brand-chocolate rounded-lg transition-colors cursor-pointer"
                title={showPassword ? "Ocultar senha" : "Ver senha"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-chocolate hover:bg-brand-deep text-brand-cream py-3 px-5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50 active:scale-98"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-brand-rose-beige" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Painel</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Rodapé de Segurança */}
        <div className="mt-8 pt-5 border-t border-brand-line text-center">
          <p className="text-[11px] text-brand-muted font-medium flex items-center justify-center gap-1.5">
            <Lock size={12} className="text-brand-muted" />
            Ambiente seguro com sessão criptografada (7 dias).
          </p>
        </div>
      </div>
    </div>
  );
}
