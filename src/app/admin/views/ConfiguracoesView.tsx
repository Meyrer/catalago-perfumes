"use client";

import { useState } from 'react';
import { 
  Settings, Shield, KeyRound, User, Users, Store, Database, CheckCircle2, 
  AlertCircle, Lock, RefreshCw, LogOut, ExternalLink, HelpCircle
} from 'lucide-react';
import type { AdminSessionUser } from '@/lib/auth';
import { changeAdminPasswordAction, logoutAdminAction } from '@/app/actions';

interface ConfiguracoesViewProps {
  user: AdminSessionUser;
}

export function ConfiguracoesView({ user }: ConfiguracoesViewProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passFeedback, setPassFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPassFeedback({ type: 'error', message: 'A nova senha deve ter no mínimo 6 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassFeedback({ type: 'error', message: 'A confirmação de senha não confere.' });
      return;
    }

    setIsChangingPass(true);
    setPassFeedback(null);
    try {
      const fd = new FormData();
      fd.append('newPassword', newPassword);
      fd.append('confirmPassword', confirmPassword);
      const res = await changeAdminPasswordAction(fd);
      if (res.success) {
        setPassFeedback({ type: 'success', message: 'Senha alterada com sucesso!' });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassFeedback({ type: 'error', message: res.error || 'Erro ao alterar senha.' });
      }
    } catch (err: any) {
      setPassFeedback({ type: 'error', message: err?.message || 'Erro inesperado ao alterar senha.' });
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Deseja realmente encerrar a sessão administrativa?')) {
      await logoutAdminAction();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#dcd5c7] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="text-[#7a5828]" size={22} />
            <h2 className="font-serif text-xl font-bold text-[#09090b]">Configurações do Sistema</h2>
          </div>
          <p className="text-xs text-[#71717a] mt-0.5">
            Gerenciamento de credenciais, administradores credenciados e preferências operacionais
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold rounded-xl transition-all shadow-xs shrink-0"
        >
          <LogOut size={15} />
          Encerrar Sessão
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA ESQUERDA: PERFIL E ALTERAÇÃO DE SENHA */}
        <div className="space-y-6 lg:col-span-2">
          {/* CARTÃO DO USUÁRIO LOGADO */}
          <div className="bg-white rounded-2xl border border-[#dcd5c7] p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#f4efe6]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#09090b] text-[#fcfbf9] flex items-center justify-center font-serif text-xl font-bold shadow-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#09090b]">{user.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-[#71717a]">
                    <span className="font-mono">@{user.username}</span>
                    <span>•</span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                      Administrador Pleno
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-[#a1a1aa] block uppercase tracking-wider font-semibold">Sessão Ativa</span>
                <span className="text-xs font-mono font-bold text-[#09090b]">PostgreSQL Auth</span>
              </div>
            </div>

            {/* FORMULÁRIO DE ALTERAÇÃO DE SENHA */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <KeyRound size={16} className="text-[#7a5828]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#09090b]">
                  Alterar Senha de Acesso
                </h4>
              </div>

              {passFeedback && (
                <div className={`p-3.5 rounded-xl border mb-4 flex items-center gap-2.5 text-xs font-medium ${
                  passFeedback.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  {passFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{passFeedback.message}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#09090b] mb-1">
                      Nova Senha
                    </label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
                      <input 
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        required
                        className="w-full pl-9 pr-3.5 py-2.5 bg-[#fcfbf9] border border-[#dcd5c7] rounded-xl text-xs text-[#09090b] outline-none focus:border-[#7a5828]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#09090b] mb-1">
                      Confirmar Nova Senha
                    </label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
                      <input 
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Repita a nova senha"
                        required
                        className="w-full pl-9 pr-3.5 py-2.5 bg-[#fcfbf9] border border-[#dcd5c7] rounded-xl text-xs text-[#09090b] outline-none focus:border-[#7a5828]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isChangingPass}
                    className="px-6 py-2.5 bg-[#09090b] hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center gap-2"
                  >
                    {isChangingPass ? <RefreshCw size={14} className="animate-spin" /> : <Shield size={14} />}
                    {isChangingPass ? 'Atualizando...' : 'Atualizar Minha Senha'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* ADMINISTRADORES AUTORIZADOS */}
          <div className="bg-white rounded-2xl border border-[#dcd5c7] p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#f4efe6]">
              <Users size={18} className="text-[#7a5828]" />
              <div>
                <h4 className="font-serif font-bold text-sm text-[#09090b]">Administradores com Acesso à Loja</h4>
                <p className="text-[11px] text-[#71717a]">Usuários com privilégio total de gestão de estoque, vendas e financeiro</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-[#e8dfd3] bg-[#fdfbf7] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#7a5828] text-white flex items-center justify-center font-bold text-xs">
                    M
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-[#09090b]">Meyrer</h5>
                    <span className="text-[11px] text-[#71717a]">Administrador Principal • meyrelena</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                  {user.username === 'Meyrer' ? 'Sua Conta Atual' : 'Ativo'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-[#e8dfd3] bg-[#fdfbf7] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#09090b] text-white flex items-center justify-center font-bold text-xs">
                    F
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-[#09090b]">Felipe</h5>
                    <span className="text-[11px] text-[#71717a]">Co-Administrador • Gestão Operacional</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                  {user.username === 'Felipe' ? 'Sua Conta Atual' : 'Ativo'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: PARÂMETROS DA LOJA & DIAGNÓSTICO */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#dcd5c7] p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#f4efe6]">
              <Store size={18} className="text-[#7a5828]" />
              <h4 className="font-serif font-bold text-sm text-[#09090b]">Dados da Loja</h4>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-[#a1a1aa] uppercase font-bold tracking-wider block">Nome Comercial</span>
                <span className="font-semibold text-[#09090b]">Elegance Perfumes Importados</span>
              </div>

              <div>
                <span className="text-[10px] text-[#a1a1aa] uppercase font-bold tracking-wider block">Canal Principal de Vendas</span>
                <span className="font-semibold text-[#09090b]">WhatsApp Oficial & Catálogo Digital</span>
              </div>

              <div>
                <span className="text-[10px] text-[#a1a1aa] uppercase font-bold tracking-wider block">Moeda Padrão</span>
                <span className="font-semibold text-[#09090b]">Real Brasileiro (BRL / R$)</span>
              </div>

              <div>
                <span className="text-[10px] text-[#a1a1aa] uppercase font-bold tracking-wider block">Moedas de Importação Suportadas</span>
                <span className="font-semibold text-[#09090b]">Dólar Comercial (USD) & Euro (EUR)</span>
              </div>
            </div>
          </div>

          <div className="bg-[#fdfbf7] rounded-2xl border border-[#e8dfd3] p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#e8dfd3]">
              <Database size={18} className="text-[#7a5828]" />
              <h4 className="font-serif font-bold text-sm text-[#09090b]">Diagnóstico do Sistema</h4>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#71717a]">Banco de Dados</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                  PostgreSQL Conectado
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#71717a]">ORM & Migrações</span>
                <span className="font-mono text-[#09090b] font-semibold">Prisma v6</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#71717a]">Framework</span>
                <span className="font-mono text-[#09090b] font-semibold">Next.js 15 (App Router)</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#71717a]">Estoque Mínimo Padrão</span>
                <span className="font-bold text-[#7a5828]">2 unidades</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#71717a]">Auditoria de Ações</span>
                <span className="font-bold text-[#09090b]">Ativada (com registro de autor)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
