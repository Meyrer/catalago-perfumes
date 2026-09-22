"use client";

import { useState, useMemo, useEffect } from 'react';
import type { ERPData } from './types';
import DashboardView from './views/DashboardView';
import ProdutosView from './views/ProdutosView';
import EstoqueView from './views/EstoqueView';
import VendasView from './views/VendasView';
import EncomendasView from './views/EncomendasView';
import ComprasView from './views/ComprasView';
import ClientesView from './views/ClientesView';
import FornecedoresView from './views/FornecedoresView';
import FinanceiroView from './views/FinanceiroView';
import RelatoriosView from './views/RelatoriosView';
import { CategoriasView } from './views/CategoriasView';
import { BannersView } from './views/BannersView';
import { ConfiguracoesView } from './views/ConfiguracoesView';

import {
  LayoutDashboard,
  Sparkles,
  Boxes,
  Tags,
  Image as ImageIcon,
  ShoppingBag,
  Clock,
  Users,
  Truck,
  Building2,
  DollarSign,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  Bell,
  LogOut,
  ShieldCheck,
  Search
} from 'lucide-react';
import Link from 'next/link';
import { logoutAdminAction } from '../actions';

interface AdminClientProps {
  data: ERPData;
}

export type AdminTab = 
  | 'dashboard'
  | 'produtos'
  | 'estoque'
  | 'categorias'
  | 'banners'
  | 'vendas'
  | 'encomendas'
  | 'clientes'
  | 'compras'
  | 'fornecedores'
  | 'financeiro'
  | 'relatorios'
  | 'configuracoes';

export default function AdminClient({ data }: AdminClientProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Carrega / Salva preferência de aba no localStorage
  useEffect(() => {
    const saved = localStorage.getItem('elegance_admin_tab') as AdminTab;
    if (saved && [
      'dashboard', 'produtos', 'estoque', 'categorias', 'banners', 
      'vendas', 'encomendas', 'clientes', 'compras', 'fornecedores', 
      'financeiro', 'relatorios', 'configuracoes'
    ].includes(saved)) {
      setActiveTab(saved);
    }
  }, []);

  const handleSelectTab = (tab: AdminTab) => {
    setActiveTab(tab);
    localStorage.setItem('elegance_admin_tab', tab);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Contadores para Badges no Menu
  const lowStockCount = useMemo(() => {
    return data.produtos.filter(p => (p.quantidade || 0) <= (p.estoqueMinimo ?? 2)).length;
  }, [data.produtos]);

  const pendingOrdersCount = useMemo(() => {
    return data.encomendas.filter(e => 
      e.status === 'SOLICITACAO_RECEBIDA' || 
      e.status === 'AGUARDANDO_PAGAMENTO' || 
      e.status === 'RECEBIDO'
    ).length;
  }, [data.encomendas]);

  const pendingVendasCount = useMemo(() => {
    return data.vendas.filter(v => v.status === 'AGUARDANDO_PAGAMENTO' || v.status === 'PREPARANDO').length;
  }, [data.vendas]);

  const handleLogout = async () => {
    if (confirm('Deseja realmente sair do painel administrativo?')) {
      await logoutAdminAction();
      window.location.reload();
    }
  };

  const navGroups = [
    {
      group: 'VISÃO GERAL',
      items: [
        { id: 'dashboard' as AdminTab, label: 'Dashboard', icon: LayoutDashboard, badge: null }
      ]
    },
    {
      group: 'OPERAÇÃO COMERCIAL',
      items: [
        { id: 'vendas' as AdminTab, label: 'Vendas & PDV', icon: ShoppingBag, badge: pendingVendasCount > 0 ? pendingVendasCount : null, badgeColor: 'bg-emerald-500' },
        { id: 'encomendas' as AdminTab, label: 'Sob Encomenda', icon: Clock, badge: pendingOrdersCount > 0 ? pendingOrdersCount : null, badgeColor: 'bg-amber-500' },
        { id: 'clientes' as AdminTab, label: 'Clientes & CRM', icon: Users, badge: null }
      ]
    },
    {
      group: 'CATÁLOGO & ESTOQUE',
      items: [
        { id: 'produtos' as AdminTab, label: 'Produtos', icon: Sparkles, badge: data.produtos.length, badgeColor: 'bg-neutral-800 text-white' },
        { id: 'estoque' as AdminTab, label: 'Gestão de Estoque', icon: Boxes, badge: lowStockCount > 0 ? lowStockCount : null, badgeColor: 'bg-rose-500 text-white' },
        { id: 'banners' as AdminTab, label: 'Banners Vitrine', icon: ImageIcon, badge: null }
      ]
    },
    {
      group: 'SUPRIMENTOS & FINANÇAS',
      items: [
        { id: 'compras' as AdminTab, label: 'Compras & Importação', icon: Truck, badge: null },
        { id: 'fornecedores' as AdminTab, label: 'Fornecedores', icon: Building2, badge: null },
        { id: 'financeiro' as AdminTab, label: 'DRE & Finanças', icon: DollarSign, badge: null },
        { id: 'relatorios' as AdminTab, label: 'Relatórios & BI', icon: BarChart3, badge: null }
      ]
    },
    {
      group: 'SISTEMA',
      items: [
        { id: 'configuracoes' as AdminTab, label: 'Configurações', icon: Settings, badge: null }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#fcfbf9] text-[#09090b] flex flex-col antialiased selection:bg-[#7a5828]/20 selection:text-[#7a5828]">
      
      {/* WRAPPER PRINCIPAL: SIDEBAR + MAIN CONTENT */}
      <div className="flex flex-1 relative">

        {/* BACKDROP MOBILE */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          />
        )}

        {/* SIDEBAR LUXUOSA */}
        <aside 
          className={`
            fixed lg:sticky top-0 h-screen z-50 bg-[#0c0c0e] text-[#e4e4e7] border-r border-[#27272a]
            flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0
            ${isSidebarCollapsed ? 'w-20' : 'w-64'}
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* TOPO DA SIDEBAR: LOGO & BRAND */}
          <div>
            <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4af37] via-[#99732f] to-[#593e10] p-[1px] shrink-0 shadow-lg shadow-black/40">
                  <div className="w-full h-full bg-[#0c0c0e] rounded-[11px] flex items-center justify-center">
                    <span className="font-serif text-lg font-bold bg-gradient-to-r from-[#e8dfd3] to-[#d4af37] bg-clip-text text-transparent">
                      E
                    </span>
                  </div>
                </div>

                {!isSidebarCollapsed && (
                  <div className="min-w-0 transition-opacity duration-200">
                    <h1 className="font-serif font-bold text-sm tracking-wide text-white uppercase leading-none">
                      Elegance
                    </h1>
                    <span className="text-[10px] text-[#a1a1aa] uppercase tracking-wider block mt-1 font-mono">
                      Boutique ERP
                    </span>
                  </div>
                )}
              </div>

              {/* Botão de colapsar (desktop apenas) */}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden lg:flex p-1.5 rounded-lg text-[#71717a] hover:text-white hover:bg-[#18181b] transition-colors"
                title={isSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
              >
                {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            </div>

            {/* ITENS DE NAVEGAÇÃO */}
            <nav className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-170px)] scrollbar-thin scrollbar-thumb-zinc-800">
              {navGroups.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1">
                  {!isSidebarCollapsed && (
                    <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#71717a] block mb-2 font-mono">
                      {group.group}
                    </span>
                  )}

                  {group.items.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectTab(item.id)}
                        title={isSidebarCollapsed ? item.label : undefined}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all relative group
                          ${isActive 
                            ? 'bg-[#18181b] text-white font-semibold shadow-xs border border-[#3f3f46]/40' 
                            : 'text-[#a1a1aa] hover:text-white hover:bg-[#141416]'}
                          ${isSidebarCollapsed ? 'justify-center px-0' : ''}
                        `}
                      >
                        {/* Linha indicadora dourada na aba ativa */}
                        {isActive && (
                          <div className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-[#d4af37] to-[#8c6721] rounded-r" />
                        )}

                        <Icon 
                          size={18} 
                          className={`shrink-0 transition-colors ${
                            isActive ? 'text-[#d4af37]' : 'text-[#71717a] group-hover:text-white'
                          }`} 
                        />

                        {!isSidebarCollapsed && (
                          <span className="truncate flex-1 text-left">{item.label}</span>
                        )}

                        {/* Badges */}
                        {item.badge !== null && !isSidebarCollapsed && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${item.badgeColor || 'bg-[#27272a] text-[#a1a1aa]'}`}>
                            {item.badge}
                          </span>
                        )}

                        {/* Dot badge quando recolhido */}
                        {item.badge !== null && isSidebarCollapsed && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#d4af37]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>

          {/* RODAPÉ DA SIDEBAR: USUÁRIO E LOGOUT */}
          <div className="p-3 border-t border-[#27272a] bg-[#09090b]/80">
            <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} gap-2`}>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-[#27272a] border border-[#3f3f46] text-[#e4e4e7] flex items-center justify-center font-bold text-xs shrink-0">
                  {data.user.name.charAt(0).toUpperCase()}
                </div>
                {!isSidebarCollapsed && (
                  <div className="min-w-0">
                    <span className="block text-xs font-semibold text-white truncate leading-tight">
                      {data.user.name}
                    </span>
                    <span className="block text-[10px] text-[#71717a] truncate font-mono">
                      @{data.user.username}
                    </span>
                  </div>
                )}
              </div>

              {!isSidebarCollapsed && (
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-[#71717a] hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                  title="Encerrar Sessão"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* ÁREA PRINCIPAL */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* TOPBAR LUXUOSA */}
          <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#dcd5c7] px-4 sm:px-8 py-3 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              {/* Botão de abrir menu no mobile */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl text-[#09090b] hover:bg-[#f4efe6] transition-colors"
              >
                <div className="w-5 h-4 flex flex-col justify-between">
                  <span className="w-full h-0.5 bg-current rounded" />
                  <span className="w-full h-0.5 bg-current rounded" />
                  <span className="w-full h-0.5 bg-current rounded" />
                </div>
              </button>

              <div>
                <div className="flex items-center gap-2 text-[11px] text-[#71717a]">
                  <span>Painel Administrativo</span>
                  <span>/</span>
                  <span className="font-semibold text-[#7a5828] capitalize">
                    {activeTab}
                  </span>
                </div>
                <h2 className="font-serif text-lg font-bold text-[#09090b] leading-tight">
                  {activeTab === 'dashboard' && 'Dashboard Executivo'}
                  {activeTab === 'vendas' && 'Vendas & Ponto de Venda (PDV)'}
                  {activeTab === 'encomendas' && 'Gestão de Pedidos Sob Encomenda'}
                  {activeTab === 'clientes' && 'Gestão de Relacionamento (CRM)'}
                  {activeTab === 'produtos' && 'Catálogo de Produtos & Precificação'}
                  {activeTab === 'estoque' && 'Gestão & Auditoria de Estoque Físico'}
                  {activeTab === 'categorias' && 'Departamentos do Catálogo'}
                  {activeTab === 'banners' && 'Vitrine & Banners Promocionais'}
                  {activeTab === 'compras' && 'Compras & Importação de Mercadorias'}
                  {activeTab === 'fornecedores' && 'Cadastro de Fornecedores'}
                  {activeTab === 'financeiro' && 'Demonstrativo Financeiro (DRE)'}
                  {activeTab === 'relatorios' && 'Relatórios Gerenciais & Exportação'}
                  {activeTab === 'configuracoes' && 'Configurações do Sistema & Acesso'}
                </h2>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO RÁPIDA NO TOPO */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => handleSelectTab('vendas')}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#09090b] hover:bg-[#18181b] text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
              >
                <Plus size={14} />
                <span>Nova Venda</span>
              </button>

              <button
                onClick={() => handleSelectTab('produtos')}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#fdfbf7] hover:bg-[#f4efe6] text-[#7a5828] border border-[#dcd5c7] text-xs font-semibold shadow-xs transition-all active:scale-95"
              >
                <Plus size={14} />
                <span>Novo Produto</span>
              </button>

              <Link
                href="/"
                target="_blank"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#f4efe6] border border-[#dcd5c7] text-[#09090b] text-xs font-semibold transition-colors"
                title="Abrir a loja para clientes em nova aba"
              >
                <ExternalLink size={14} className="text-[#7a5828]" />
                <span className="hidden md:inline">Ver Loja</span>
              </Link>
            </div>
          </header>

          {/* ÁREA DE CONTEÚDO ATIVO */}
          <main className="flex-1 p-4 sm:p-8 w-full max-w-[1720px] mx-auto animate-fadeIn">
            {activeTab === 'dashboard' && (
              <DashboardView 
                data={data} 
                onNavigate={(tab) => handleSelectTab(tab as AdminTab)} 
              />
            )}

            {activeTab === 'vendas' && (
              <VendasView data={data} />
            )}

            {activeTab === 'encomendas' && (
              <EncomendasView data={data} />
            )}

            {activeTab === 'clientes' && (
              <ClientesView data={data} />
            )}

            {activeTab === 'produtos' && (
              <ProdutosView data={data} />
            )}

            {activeTab === 'estoque' && (
              <EstoqueView data={data} />
            )}

            {activeTab === 'categorias' && (
              <CategoriasView 
                categorias={data.categorias} 
                produtos={data.produtos} 
              />
            )}

            {activeTab === 'banners' && (
              <BannersView banners={data.banners} />
            )}

            {activeTab === 'compras' && (
              <ComprasView data={data} />
            )}

            {activeTab === 'fornecedores' && (
              <FornecedoresView data={data} />
            )}

            {activeTab === 'financeiro' && (
              <FinanceiroView data={data} />
            )}

            {activeTab === 'relatorios' && (
              <RelatoriosView data={data} />
            )}

            {activeTab === 'configuracoes' && (
              <ConfiguracoesView user={data.user} />
            )}
          </main>

        </div>
      </div>
    </div>
  );
}
