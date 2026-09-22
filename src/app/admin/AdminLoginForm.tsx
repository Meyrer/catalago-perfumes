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
    <div className="min-h-screen bg-[#fcfbf9] flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-[#f5ede2] selection:text-[#09090b]">
      {/* Botão de retorno ao catálogo */}
      <div className="w-full max-w-md mb-6 flex justify-start">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#27272a] hover:text-[#09090b] transition-colors py-1.5 px-3 rounded-full hover:bg-white border border-transparent hover:border-[#dcd5c7]"
        >
          <ArrowLeft size={15} /> Voltar à loja pública
        </Link>
      </div>

      {/* Card Principal de Login */}
      <div className="w-full max-w-md bg-white rounded-3xl border-2 border-[#dcd5c7] shadow-xl p-7 sm:p-10 relative overflow-hidden">
        {/* Detalhe superior em bronze */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7a5828] via-[#a37941] to-[#7a5828]" />

        {/* Cabeçalho da Marca */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-[#fbf9f5] border-1.5 border-[#dcd5c7] flex items-center justify-center text-[#7a5828] shadow-xs">
            <ShieldCheck size={28} />
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif tracking-[0.16em] font-medium text-[#09090b]">
            ELEGANCE
          </h1>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#7a5828] font-bold mt-1">
            Painel Administrativo
          </p>
          <p className="text-xs text-[#27272a] mt-2 font-medium">
            Área restrita de gestão de produtos, estoque e custos.
          </p>
        </div>

        {/* Formulário de Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200 font-medium">
              <AlertCircle size={16} className="text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="admin-username"
              className="block text-xs font-bold text-[#09090b] uppercase tracking-wider mb-1.5"
            >
              Usuário
            </label>
            <div className="relative flex items-center">
              <User size={16} className="absolute left-3.5 text-[#3f3f46] pointer-events-none" />
              <input
                id="admin-username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-[#dcd5c7] rounded-xl text-sm font-semibold text-[#09090b] outline-none focus:border-[#09090b] focus:ring-4 focus:ring-[#09090b]/5 transition-all"
                placeholder="Ex: Meyrer ou Felipe"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-bold text-[#09090b] uppercase tracking-wider mb-1.5"
            >
              Senha
            </label>
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-3.5 text-[#3f3f46] pointer-events-none" />
              <input
                id="admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                className="w-full pl-10 pr-11 py-2.5 bg-white border-2 border-[#dcd5c7] rounded-xl text-sm font-semibold text-[#09090b] outline-none focus:border-[#09090b] focus:ring-4 focus:ring-[#09090b]/5 transition-all"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1 text-[#3f3f46] hover:text-[#09090b] rounded-lg transition-colors cursor-pointer"
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
              className="w-full bg-[#09090b] hover:bg-[#27272a] text-white py-3 px-5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50 active:scale-98"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-[#e8cda8]" />
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
        <div className="mt-8 pt-5 border-t border-[#dcd5c7] text-center">
          <p className="text-[11px] text-[#3f3f46] font-medium flex items-center justify-center gap-1.5">
            <Lock size={12} className="text-[#7a5828]" />
            Ambiente seguro com sessão criptografada (7 dias).
          </p>
        </div>
      </div>
    </div>
  );
}
