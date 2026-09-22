"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, ShoppingBag, Heart, X, Check, ArrowRight, Sparkles, MessageCircle, Truck, SlidersHorizontal, ChevronRight, ChevronLeft, Plus, Minus,
  ArrowUpRight, CheckCircle2, Clock, CalendarCheck, Home, ShieldCheck, ZoomIn, ZoomOut
} from 'lucide-react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { useDialog } from './useDialog';
import FragranceSearch from '@/components/FragranceSearch';
import CustomOrderModal from '@/components/CustomOrderModal';

type Foto = { id: number; url: string };
type Categoria = { id: number; nome: string; imagemUrl?: string | null };

type Produto = {
  id: number;
  nome: string;
  marca: string;
  descricao: string;
  precoVista: number;
  precoOriginal: number | null;
  precoParcelado: string | null;
  quantidade?: number;
  volume: string | null;
  modoUso: string | null;
  caracteristicas: string | null;
  badge: string | null;
  disponivel: boolean;
  tipoDisponibilidade: 'PRONTA_ENTREGA' | 'ENCOMENDA' | string;
  previsaoEntrega: string | null;
  destaque: boolean;
  categoriaId: number;
  categoria: Categoria;
  fotos: Foto[];
  familiaOlfativa?: string | null;
  acordesPrincipais?: import("@prisma/client").Prisma.JsonValue;
  notasSaida?: import("@prisma/client").Prisma.JsonValue;
  notasCoracao?: import("@prisma/client").Prisma.JsonValue;
  notasFundo?: import("@prisma/client").Prisma.JsonValue;
  concentracao?: string | null;
  genero?: string | null;
  anoLancamento?: number | null;
  descricaoFragrancia?: string | null;
  longevidade?: string | null;
  projecao?: string | null;
  createdAt?: Date | string;
};

type Banner = {
  id: number;
  imagemUrl: string;
  link: string | null;
  titulo?: string | null;
  subtitulo?: string | null;
};

export function isProdutoProntaEntrega(p?: { tipoDisponibilidade: string; quantidade?: number | null } | null): boolean {
  if (!p) return false;
  return p.tipoDisponibilidade === 'PRONTA_ENTREGA' && (p.quantidade ?? 1) > 0;
}

export default function CatalogClient({
  initialProdutos,
  categorias,
  banners
}: {
  initialProdutos: Produto[];
  categorias: Categoria[];
  banners: Banner[];
}) {
  // Navigation & Filter States
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const [selectedBrand, setSelectedBrand] = useState<string>('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'TODOS' | 'PRONTA_ENTREGA' | 'ENCOMENDA'>('TODOS');
  const [onlyPromos, setOnlyPromos] = useState(false);
  const [sortBy, setSortBy] = useState<'mais-vendidos' | 'menor-preco' | 'maior-preco' | 'novidades'>('mais-vendidos');
  const [customEncomendaQuery, setCustomEncomendaQuery] = useState('');
  const [isCustomOrderOpen, setIsCustomOrderOpen] = useState(false);
  const [customOrderInitialValue, setCustomOrderInitialValue] = useState('');

  const openCustomOrderModal = (initialQuery = '') => {
    setCustomOrderInitialValue(initialQuery);
    setIsCustomOrderOpen(true);
  };

  const [priceRange, setPriceRange] = useState('todos');
  const [visibleCount, setVisibleCount] = useState(12);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Curated Featured Products for Hero Showcase
  const heroFeaturedProducts = useMemo(() => {
    const list: Produto[] = [];
    const p1 = initialProdutos.find(p => p.nome.toLowerCase().includes('libre le parfum')) || initialProdutos.find(p => p.nome.toLowerCase().includes('libre'));
    const p2 = initialProdutos.find(p => p.nome.toLowerCase().includes('sauvage'));
    const p3 = initialProdutos.find(p => p.nome.toLowerCase().includes('crystal noir') && p.categoria?.nome?.toLowerCase().includes('mini'));
    const p4 = initialProdutos.find(p => p.nome.toLowerCase().includes('bare vanilla'));

    if (p1) list.push(p1);
    if (p2) list.push(p2);
    if (p3) list.push(p3);
    if (p4) list.push(p4);

    return list.length > 0 ? list : initialProdutos.slice(0, 4);
  }, [initialProdutos]);

  const [featuredIndex, setFeaturedIndex] = useState(0);

  // Auto rotate featured showcase
  useEffect(() => {
    if (heroFeaturedProducts.length <= 1) return;
    const timer = setInterval(() => {
      setFeaturedIndex(prev => (prev + 1) % heroFeaturedProducts.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroFeaturedProducts.length]);

  const currentFeatured = heroFeaturedProducts[featuredIndex] || heroFeaturedProducts[0];

  const featuredAcordes: string[] = useMemo(() => {
    if (!currentFeatured?.acordesPrincipais) return [];
    if (Array.isArray(currentFeatured.acordesPrincipais)) return currentFeatured.acordesPrincipais as string[];
    if (typeof currentFeatured.acordesPrincipais === 'string') {
      try {
        const parsed = JSON.parse(currentFeatured.acordesPrincipais);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return (currentFeatured.acordesPrincipais as string).split(',').map(s => s.trim());
      }
    }
    return [];
  }, [currentFeatured]);

  const clearFilters = () => {
    setActiveCategory('todos'); setSelectedBrand('todas'); setSearchTerm('');
    setAvailabilityFilter('TODOS'); setOnlyPromos(false); setPriceRange('todos'); setVisibleCount(12);
  };
  const scrollToCatalog = () => requestAnimationFrame(() => document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth' }));

  // Cart & Favorites States
  const [cart, setCart] = useState<{ produto: Produto; qtd: number }[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });

  // Product Modal / Quick View
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isPhotoZoomOpen, setIsPhotoZoomOpen] = useState(false);
  const [catalogZoomScale, setCatalogZoomScale] = useState(1);

  const closeDialog = () => { 
    if (isPhotoZoomOpen) {
      setIsPhotoZoomOpen(false);
      setCatalogZoomScale(1);
      return;
    }
    setSelectedProduct(null); 
    setIsCartOpen(false); 
    setIsFavoritesOpen(false); 
  };
  const dialogRef = useDialog(Boolean(selectedProduct || isCartOpen || isFavoritesOpen), closeDialog);
  const chooseProduct = (product: Produto) => { setActiveImageIndex(0); setSelectedProduct(product); };
  const hasFilters = Boolean(searchTerm.trim() || activeCategory !== 'todos' || selectedBrand !== 'todas' || availabilityFilter !== 'TODOS' || onlyPromos || priceRange !== 'todos');

  // Header scroll state
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 25);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Category Nav Scroll Controls (evita corte de texto no desktop e mobile)
  const categoryNavRef = useRef<HTMLElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isDraggingNavRef = useRef(false);
  const startXNavRef = useRef(0);
  const scrollLeftNavRef = useRef(0);
  const hasMovedNavRef = useRef(false);

  const checkCategoryScroll = () => {
    const el = categoryNavRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  };

  useEffect(() => {
    checkCategoryScroll();
    const t1 = setTimeout(checkCategoryScroll, 100);
    const t2 = setTimeout(checkCategoryScroll, 400);
    const t3 = setTimeout(checkCategoryScroll, 1000);
    window.addEventListener('resize', checkCategoryScroll);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', checkCategoryScroll);
    };
  }, [categorias]);

  // Rola suavemente o botão da categoria selecionada para o campo visual
  useEffect(() => {
    if (!categoryNavRef.current) return;
    const activeEl = categoryNavRef.current.querySelector('[data-active="true"]') as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      setTimeout(checkCategoryScroll, 350);
    }
  }, [activeCategory]);

  const scrollCategoryNav = (direction: 'left' | 'right') => {
    const el = categoryNavRef.current;
    if (!el) return;
    const scrollAmount = direction === 'left' ? -200 : 200;
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    setTimeout(checkCategoryScroll, 350);
  };

  const handleNavMouseDown = (e: React.MouseEvent) => {
    const el = categoryNavRef.current;
    if (!el) return;
    isDraggingNavRef.current = true;
    hasMovedNavRef.current = false;
    startXNavRef.current = e.pageX - el.offsetLeft;
    scrollLeftNavRef.current = el.scrollLeft;
  };

  const handleNavMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingNavRef.current) return;
    const el = categoryNavRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXNavRef.current) * 1.4;
    if (Math.abs(walk) > 4) {
      hasMovedNavRef.current = true;
    }
    el.scrollLeft = scrollLeftNavRef.current - walk;
    checkCategoryScroll();
  };

  const handleNavMouseUp = () => {
    isDraggingNavRef.current = false;
    setTimeout(() => {
      hasMovedNavRef.current = false;
    }, 60);
  };

  const selectCategory = (catName: string) => {
    if (hasMovedNavRef.current) return;
    setActiveCategory(catName);
    setSelectedBrand('todas');
    setVisibleCount(12);
    scrollToCatalog();
  };

  // Nomes concisos e elegantes para o menu superior (sem cortes)
  const getCategoryShortName = (nome: string) => {
    const clean = nome.trim().toLowerCase();
    if (clean.includes('mini') || clean.includes('brand')) return 'Mini Brands (25ml)';
    if (clean.includes('splash')) return 'Body Splash';
    if (clean.includes('creme') || clean.includes('loção') || clean.includes('locao')) return 'Cremes & Loções';
    if (clean.includes('feminino')) return 'Femininos';
    if (clean.includes('masculino')) return 'Masculinos';
    return nome;
  };

  const getCategoryCount = (catNome: string) => {
    return initialProdutos.filter(p => 
      p.categoria?.nome?.toLowerCase().includes(catNome.toLowerCase()) || 
      catNome.toLowerCase().includes(p.categoria?.nome?.toLowerCase())
    ).length;
  };

  // Ordenação inteligente das categorias: Mini Brands e Body Splash primeiro, omitindo categorias vazias
  const sortedCategorias = useMemo(() => {
    const priority = [
      'mini brands',
      'brand collection',
      'body splash',
      'cremes e loções',
      'perfumes femininos',
      'perfumes masculinos'
    ];
    return [...categorias]
      .filter(cat => getCategoryCount(cat.nome) > 0)
      .sort((a, b) => {
        const idxA = priority.findIndex(p => a.nome.toLowerCase().includes(p) || p.includes(a.nome.toLowerCase()));
        const idxB = priority.findIndex(p => b.nome.toLowerCase().includes(p) || p.includes(b.nome.toLowerCase()));
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.nome.localeCompare(b.nome);
      });
  }, [categorias, initialProdutos]);

  // LocalStorage sync
  useEffect(() => {
    try {
      const savedFavs = localStorage.getItem('elegance_favorites');
      if (savedFavs) {
        const parsed: unknown = JSON.parse(savedFavs);
        // Browser-only persisted state is restored after SSR hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (Array.isArray(parsed)) setFavorites(parsed.filter((id): id is number => typeof id === 'number'));
      }

      const savedCart = localStorage.getItem('elegance_cart');
      if (savedCart) {
        const parsed: unknown = JSON.parse(savedCart);
        if (Array.isArray(parsed)) setCart(parsed.flatMap(item => {
          const produto = initialProdutos.find(p => p.id === item?.produto?.id);
          return produto && Number.isInteger(item.qtd) && item.qtd > 0 ? [{produto, qtd: item.qtd}] : [];
        }));
      }
    } catch (e) {
      console.error(e);
    }
  }, [initialProdutos]);

  const toggleFavorite = (productId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    showToast(favorites.includes(productId) ? "Removido dos favoritos" : "Adicionado aos favoritos");
    setFavorites(prev => {
      const next = prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId];
      try {
        localStorage.setItem('elegance_favorites', JSON.stringify(next));
      } catch { /* Keep this session usable when storage is unavailable. */ }
      return next;
    });
  };

  const showToast = (message: string) => {
    setToast({ message, show: true });
    setTimeout(() => setToast({ message: '', show: false }), 2800);
  };

  const addToCart = (produto: Produto, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart(prev => {
      const exists = prev.find(item => item.produto.id === produto.id);
      let updated;
      if (exists) {
        updated = prev.map(item => 
          item.produto.id === produto.id ? { ...item, qtd: item.qtd + 1 } : item
        );
      } else {
        updated = [...prev, { produto, qtd: 1 }];
      }
      try {
        localStorage.setItem('elegance_cart', JSON.stringify(updated));
      } catch { /* Keep this session usable when storage is unavailable. */ }
      return updated;
    });
    showToast(`✓ ${produto.nome} adicionado à sacola`);
  };

  const updateCartQtd = (productId: number, delta: number) => {
    setCart(prev => {
      const updated = prev.map(item => {
        if (item.produto.id === productId) {
          const newQtd = item.qtd + delta;
          return newQtd > 0 ? { ...item, qtd: newQtd } : null;
        }
        return item;
      }).filter(Boolean) as { produto: Produto; qtd: number }[];
      try {
        localStorage.setItem('elegance_cart', JSON.stringify(updated));
      } catch { /* Keep this session usable when storage is unavailable. */ }
      return updated;
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => {
      const updated = prev.filter(item => item.produto.id !== productId);
      try {
        localStorage.setItem('elegance_cart', JSON.stringify(updated));
      } catch { /* Keep this session usable when storage is unavailable. */ }
      return updated;
    });
  };

  // WhatsApp Configuration
  const WHATSAPP_PHONE = "5511999999999"; // Configure seu WhatsApp de atendimento aqui

  const buyDirectOnWhatsApp = (produto: Produto, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const formattedPrice = produto.precoVista.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    let msg = "";
    if (isProdutoProntaEntrega(produto)) {
      msg = `Olá! Vi no catálogo o produto *${produto.nome}* (${produto.marca}) a *PRONTA ENTREGA* no valor de ${formattedPrice}. Gostaria de reservar para entrega/retirada!`;
    } else {
      msg = `Olá! Vi no catálogo o produto *${produto.nome}* (${produto.marca}) no valor de ${formattedPrice} e gostaria de fazer a *ENCOMENDA* dele. Quando chega o próximo pedido?`;
    }

    window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const checkoutCartOnWhatsApp = () => {
    if (cart.length === 0) return;
    let msg = "Olá! Gostaria de fazer o pedido dos seguintes produtos da minha sacola:\n\n";
    cart.forEach(item => {
      const price = (item.produto.precoVista * item.qtd).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const status = isProdutoProntaEntrega(item.produto) ? '[Pronta Entrega]' : '[Sob Encomenda]';
      msg += `• ${item.qtd}x ${item.produto.nome} (${item.produto.marca}) ${status} — ${price}\n`;
    });
    const total = cart.reduce((acc, item) => acc + (item.produto.precoVista * item.qtd), 0);
    msg += `\n*Valor Total: ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*`;
    msg += "\n\nPoderia me passar os detalhes para combinarmos a entrega/prazos de encomenda e pagamento?";
    window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const generalWhatsAppContact = (customMessage?: string) => {
    const msg = customMessage || "Olá! Gostaria de tirar uma dúvida sobre os produtos a pronta entrega e encomendas do catálogo.";
    window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const orderCustomFragranceWhatsApp = (customName?: string) => {
    const requested = (customName || customEncomendaQuery).trim();
    let msg = "";
    if (requested) {
      msg = `Olá! Gostaria de solicitar um orçamento sob encomenda para o produto: *${requested}*.\n\nVi no catálogo que é possível encomendar qualquer perfume/cosmético com a condição de *50% no pedido e 50% na entrega*. Poderia me passar os valores e a previsão de chegada?`;
    } else {
      msg = `Olá! Gostaria de solicitar um orçamento para um perfume/cosmético importado sob encomenda.\n\nVi no catálogo que vocês conseguem qualquer fragrância com *50% no pedido e 50% na entrega*. Como posso fazer meu pedido?`;
    }
    window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Brands list
  const brandsList = useMemo(() => {
    return Array.from(new Set(initialProdutos.map(p => p.marca))).sort();
  }, [initialProdutos]);

  // Counts for availability switcher
  const prontaEntregaCount = useMemo(() => {
    return initialProdutos.filter(p => isProdutoProntaEntrega(p)).length;
  }, [initialProdutos]);

  const encomendaCount = useMemo(() => {
    return initialProdutos.filter(p => !isProdutoProntaEntrega(p)).length;
  }, [initialProdutos]);

  // Main filtered products logic
  const filteredProdutos = useMemo(() => {
    let result = [...initialProdutos];

    // Availability Filter (Pronta Entrega vs Encomenda)
    if (availabilityFilter === 'PRONTA_ENTREGA') {
      result = result.filter(p => isProdutoProntaEntrega(p));
    } else if (availabilityFilter === 'ENCOMENDA') {
      result = result.filter(p => !isProdutoProntaEntrega(p));
    }

    // Category filter
    if (activeCategory !== 'todos' && activeCategory !== 'promocoes') {
      result = result.filter(p => p.categoria.nome.toLowerCase() === activeCategory.toLowerCase());
    } else if (activeCategory === 'promocoes') {
      result = result.filter(p => (p.precoOriginal && p.precoOriginal > p.precoVista) || p.badge === 'OFERTA');
    }

    // Brand filter
    if (selectedBrand !== 'todas') {
      result = result.filter(p => p.marca.toLowerCase() === selectedBrand.toLowerCase());
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const matches = (value: string) => value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q);
      result = result.filter(p => 
        matches(p.nome) ||
        matches(p.marca) ||
        matches(p.categoria.nome) ||
        (p.caracteristicas && matches(p.caracteristicas))
      );
    }

    // Promo filter
    if (onlyPromos) {
      result = result.filter(p => (p.precoOriginal && p.precoOriginal > p.precoVista) || p.badge === 'OFERTA');
    }

    if (priceRange === 'ate-100') result = result.filter(p => p.precoVista <= 100);
    if (priceRange === '100-200') result = result.filter(p => p.precoVista > 100 && p.precoVista <= 200);
    if (priceRange === 'acima-200') result = result.filter(p => p.precoVista > 200);
    // Sort
    if (sortBy === 'menor-preco') {
      result.sort((a, b) => a.precoVista - b.precoVista);
    } else if (sortBy === 'maior-preco') {
      result.sort((a, b) => b.precoVista - a.precoVista);
    } else if (sortBy === 'novidades') {
      result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (sortBy === 'mais-vendidos') {
      result.sort((a, b) => (b.badge === 'MAIS VENDIDO' ? 1 : 0) - (a.badge === 'MAIS VENDIDO' ? 1 : 0));
    }

    return result;
  }, [initialProdutos, availabilityFilter, activeCategory, selectedBrand, searchTerm, onlyPromos, sortBy, priceRange]);

  // Related products for detail modal
  const relatedProducts = useMemo(() => {
    if (!selectedProduct) return [];
    return initialProdutos
      .filter(p => p.categoriaId === selectedProduct.categoriaId && p.id !== selectedProduct.id)
      .slice(0, 4);
  }, [selectedProduct, initialProdutos]);

  const CatalogHeading = hasFilters ? 'h1' : 'h2';
  const cartTotal = cart.reduce((acc, item) => acc + (item.produto.precoVista * item.qtd), 0);
  const cartTotalItems = cart.reduce((acc, item) => acc + item.qtd, 0);

  return (
    <MotionConfig reducedMotion="user"><div className="catalog-app min-h-screen w-full max-w-full bg-[#fcfbf9] text-[#18181b] flex flex-col selection:bg-[#eedfd2] selection:text-[#18181b] relative">
      
      <a href="#produtos" className="skip-link">Ir para os produtos</a>
      {/* 1. TOP ANNOUNCEMENT BAR */}
      <div className="bg-[#18181b] text-white py-2 px-3 sm:px-4 text-xs tracking-wide w-full overflow-hidden">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-[11px] md:text-xs">
          <p className="flex items-center gap-2 mx-auto md:mx-0 font-medium text-white/90 text-center">
            <Sparkles size={13} className="text-[#c5a880] shrink-0" />
            <span className="truncate sm:whitespace-normal">Pronta Entrega & Encomendas • 100% Originais</span>
          </p>
          <div className="hidden md:flex items-center gap-4 text-white/80 font-medium">
            <span className="flex items-center gap-1.5"><Truck size={13} className="text-[#c5a880]" /> Entrega combinada</span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <button 
              onClick={() => openCustomOrderModal()} 
              className="text-[#eedfd2] hover:text-[#c5a880] transition-colors flex items-center gap-1.5 font-semibold"
            >
              <Sparkles size={12} className="text-[#c5a880]" /> Pedir Sob Encomenda
            </button>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <button onClick={() => generalWhatsAppContact()} className="hover:text-[#c5a880] transition-colors flex items-center gap-1">
              Fale no WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* 2. HEADER ELEGANTE */}
      <header className={`catalog-header sticky top-0 z-40 transition-all duration-300 w-full max-w-full overflow-hidden ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md border-b border-[#dcd5c7] shadow-[0_2px_15px_rgba(0,0,0,0.04)] py-2.5 sm:py-3' 
          : 'bg-white border-b border-[#dcd5c7] py-3 sm:py-4'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex items-center justify-between gap-4 md:gap-8">
            
            {/* LOGO */}
            <div className="flex items-center gap-3">
              <a href="#" onClick={clearFilters} className="flex flex-col group">
                <span className="text-xl sm:text-2xl lg:text-3xl font-serif tracking-[0.18em] font-medium text-[#09090b] group-hover:text-[#7a5828] transition-colors">
                  ELEGANCE
                </span>
                <span className="text-[9px] uppercase tracking-[0.35em] text-[#3f3f46] font-semibold -mt-1 font-sans">
                  Pronta Entrega & Encomendas
                </span>
              </a>
            </div>

            {/* SEARCH BAR (DESKTOP) */}
            <div className="hidden md:flex flex-1 max-w-xl relative">
              <FragranceSearch
                onSelectLocalProduct={(id) => {
                  const p = initialProdutos.find(prod => prod.id === id);
                  if (p) chooseProduct(p);
                }}
                onManualCreate={() => openCustomOrderModal()}
                onSuccessImport={() => {
                  setToast({ message: 'Fragrância adicionada ao catálogo!', show: true });
                }}
              />
            </div>

            {/* ACTION ICONS */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => openCustomOrderModal()}
                title="Pedir perfume sob encomenda"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-[#dcd5c7] bg-[#fbf9f5] hover:bg-[#09090b] hover:border-[#09090b] hover:text-white text-xs font-bold text-[#09090b] transition-all shadow-xs mr-1 cursor-pointer"
              >
                <Sparkles size={13} className="text-[#7a5828]" />
                <span>Sob Encomenda</span>
              </button>

              <button 
                onClick={() => generalWhatsAppContact()}
                title="Conversar no WhatsApp"
                className="p-2.5 text-[#09090b] hover:text-[#15803d] hover:bg-[#f7f4ef] rounded-full transition-all flex items-center justify-center cursor-pointer"
              >
                <MessageCircle size={20} />
              </button>

              <button 
                onClick={() => setIsFavoritesOpen(true)}
                title="Meus Favoritos"
                aria-label="Meus favoritos"
                className="relative p-2.5 text-[#09090b] hover:text-[#7a5828] hover:bg-[#f7f4ef] rounded-full transition-all cursor-pointer"
              >
                <Heart size={20} className={favorites.length > 0 ? "fill-[#7a5828] text-[#7a5828]" : ""} />
                {favorites.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#7a5828] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {favorites.length}
                  </span>
                )}
              </button>

              <button 
                onClick={() => setIsCartOpen(true)}
                title="Sacola de Compras"
                aria-label="Sacola de compras"
                className="relative p-2.5 text-[#09090b] hover:text-[#7a5828] hover:bg-[#f7f4ef] rounded-full transition-all flex items-center gap-2 cursor-pointer"
              >
                <ShoppingBag size={20} />
                {cartTotalItems > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#09090b] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartTotalItems}
                  </span>
                )}
                <span className="hidden lg:inline-block text-xs font-bold text-[#09090b]">
                  {cartTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </button>
            </div>
          </div>

          {/* SEARCH BAR (MOBILE) */}
          <div className="mt-3 md:hidden relative">
            <FragranceSearch
              onSelectLocalProduct={(id) => {
                const p = initialProdutos.find(prod => prod.id === id);
                if (p) chooseProduct(p);
              }}
              onManualCreate={() => openCustomOrderModal()}
              onSuccessImport={() => {
                setToast({ message: 'Fragrância adicionada ao catálogo!', show: true });
              }}
            />
          </div>

          {/* CATEGORIES NAVIGATION WITH FLUID TOUCH, DRAG & CHEVRON CONTROLS (SEM CORTES) */}
          <div className="relative mt-2.5 pt-2 border-t border-[#dcd5c7] flex items-center min-w-0 w-full overflow-hidden">
            {/* Scroll Left Button (Mobile & Desktop) */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollCategoryNav('left')}
                className="flex absolute left-0 z-20 w-7 h-7 rounded-full bg-white shadow-md border-1.5 border-[#dcd5c7] items-center justify-center text-[#09090b] hover:bg-[#f7f4ef] hover:border-[#09090b] active:scale-90 transition-all cursor-pointer"
                title="Rolar para a esquerda"
              >
                <ChevronLeft size={15} />
              </button>
            )}

            {/* Left fade gradient */}
            {canScrollLeft && (
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-9 bg-gradient-to-r from-white via-white/80 to-transparent z-10" />
            )}

            <nav 
              aria-label="Categorias do catálogo" ref={categoryNavRef}
              onScroll={checkCategoryScroll}
              onMouseDown={handleNavMouseDown}
              onMouseMove={handleNavMouseMove}
              onMouseUp={handleNavMouseUp}
              onMouseLeave={handleNavMouseUp}
              onWheel={(e) => {
                if (e.deltaY !== 0 && categoryNavRef.current) {
                  categoryNavRef.current.scrollLeft += e.deltaY;
                  checkCategoryScroll();
                }
              }}
              style={{
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-x pan-y',
              }}
              className="w-full min-w-0 overflow-x-auto no-scrollbar touch-scroll-x select-none overscroll-x-contain cursor-grab active:cursor-grabbing px-1 sm:px-2 py-1"
            >
              <ul className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap w-max shrink-0 text-xs sm:text-[13px]">
                <li>
                  <button
                    data-active={activeCategory === 'todos'}
                    onClick={() => selectCategory('todos')}
                    className={`px-3.5 py-1.5 rounded-full transition-all border ${
                      activeCategory === 'todos' 
                        ? 'bg-[#09090b] border-[#09090b] text-white font-bold shadow-xs' 
                        : 'border-[#dcd5c7] bg-white text-[#09090b] font-semibold hover:border-[#09090b] hover:bg-[#faf8f5] shadow-2xs'
                    }`}
                  >
                    Todos os produtos
                  </button>
                </li>
                {sortedCategorias.map(cat => {
                  const isSelected = activeCategory.toLowerCase() === cat.nome.toLowerCase();
                  return (
                    <li key={cat.id}>
                      <button
                        data-active={isSelected}
                        onClick={() => selectCategory(cat.nome)}
                        className={`px-3.5 py-1.5 rounded-full transition-all border ${
                          isSelected
                            ? 'bg-[#09090b] border-[#09090b] text-white font-bold shadow-xs'
                            : 'border-[#dcd5c7] bg-white text-[#09090b] font-semibold hover:border-[#09090b] hover:bg-[#faf8f5] shadow-2xs'
                        }`}
                        title={cat.nome}
                      >
                        {getCategoryShortName(cat.nome)}
                      </button>
                    </li>
                  );
                })}
                <li>
                  <button
                    data-active={activeCategory === 'promocoes'}
                    onClick={() => selectCategory('promocoes')}
                    className={`px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 border ${
                      activeCategory === 'promocoes'
                        ? 'bg-[#7a5828] border-[#7a5828] text-white font-bold shadow-xs'
                        : 'border-[#cbbca8] bg-[#f8f2e9] text-[#6b4719] font-bold hover:bg-[#f0e3ce] shadow-2xs'
                    }`}
                  >
                    <Sparkles size={12} /> Ofertas
                  </button>
                </li>
              </ul>
            </nav>

            {/* Right fade gradient */}
            {canScrollRight && (
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-9 bg-gradient-to-l from-white via-white/80 to-transparent z-10" />
            )}

            {/* Scroll Right Button (Mobile & Desktop) */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollCategoryNav('right')}
                className="flex absolute right-0 z-20 w-7 h-7 rounded-full bg-white shadow-md border-1.5 border-[#dcd5c7] items-center justify-center text-[#09090b] hover:bg-[#f7f4ef] hover:border-[#09090b] active:scale-90 transition-all cursor-pointer"
                title="Rolar para a direita"
              >
                <ChevronRight size={15} />
              </button>
            )}
          </div>

        </div>
      </header>

      <main id="conteudo">
      {!hasFilters && <>
      <section className="catalog-hero">
        <div className="hero-inner shell">
          <div className="hero-copy">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[#7a5828] mb-2.5">
              <Sparkles size={13} /> Alta Perfumaria & Cuidados
            </span>
            <h1>Encontre sua<br />próxima fragrância.</h1>
            <p>Perfumes importados e cuidados para o seu ritual. Escolha entre pronta entrega imediata e encomendas de grife com atendimento pelo WhatsApp.</p>
            <div className="hero-actions">
              <button 
                type="button"
                onClick={() => openCustomOrderModal()}
                className="button-primary flex items-center gap-2 cursor-pointer"
              >
                Solicitar perfume sob encomenda <ArrowRight size={16} />
              </button>
              <a 
                href={`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent('Olá! Gostaria de tirar uma dúvida sobre os perfumes da Elegance.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="button-text flex items-center gap-1.5 text-xs text-[#27272a] hover:text-[#09090b] font-semibold transition-colors"
              >
                <MessageCircle size={15} className="text-[#15803d]" /> Dúvidas no WhatsApp
              </a>
            </div>
          </div>

          {/* VITRINE INTERATIVA DE PERFUMES EM DESTAQUE (ESTILO SEPHORA / FRAGRANTICA) */}
          {currentFeatured && (
            <div className="hero-featured-wrapper">
              <div className="w-full min-w-0 bg-white rounded-2xl border-2 border-[#dcd5c7] shadow-md hover:shadow-lg transition-all p-4 sm:p-5 flex flex-col justify-between gap-3.5 relative overflow-hidden sm:h-[365px]">
                {/* Top bar with badge and navigation */}
                <div className="flex items-center justify-between gap-2 border-b border-[#dcd5c7] pb-2.5 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Sparkles size={14} className="text-[#7a5828] shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#09090b] truncate">
                      Destaque em Alta
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-[#27272a] font-bold mr-1">
                      {featuredIndex + 1} de {heroFeaturedProducts.length}
                    </span>
                    <button
                      onClick={() => setFeaturedIndex((prev) => (prev - 1 + heroFeaturedProducts.length) % heroFeaturedProducts.length)}
                      className="w-6 h-6 rounded-full border border-[#dcd5c7] flex items-center justify-center text-[#09090b] hover:border-[#09090b] hover:bg-[#faf8f5] transition-colors cursor-pointer"
                      title="Anterior"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <button
                      onClick={() => setFeaturedIndex((prev) => (prev + 1) % heroFeaturedProducts.length)}
                      className="w-6 h-6 rounded-full border border-[#dcd5c7] flex items-center justify-center text-[#09090b] hover:border-[#09090b] hover:bg-[#faf8f5] transition-colors cursor-pointer"
                      title="Próximo"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>

                {/* Product preview row with locked height to prevent layout shifts */}
                <div 
                  onClick={() => chooseProduct(currentFeatured)}
                  className="flex gap-4 cursor-pointer group min-w-0 h-[136px] sm:h-[142px]"
                >
                  {/* Photo */}
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-white border border-[#dcd5c7] p-2 flex items-center justify-center shrink-0 relative overflow-hidden self-center shadow-2xs">
                    <ProductImage
                      src={currentFeatured.fotos[0]?.url}
                      alt={currentFeatured.nome}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                    {isProdutoProntaEntrega(currentFeatured) ? (
                      <span className="absolute bottom-1.5 left-1.5 right-1.5 text-center text-[9px] font-extrabold uppercase tracking-wider bg-emerald-800 text-white py-0.5 rounded shadow-xs">
                        Pronta Entrega
                      </span>
                    ) : (
                      <span className="absolute bottom-1.5 left-1.5 right-1.5 text-center text-[9px] font-extrabold uppercase tracking-wider bg-[#7a5828] text-white py-0.5 rounded shadow-xs">
                        Sob Encomenda
                      </span>
                    )}
                  </div>

                  {/* Info with locked slot heights */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 h-full">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-[#7a5828] truncate">
                          {currentFeatured.marca}
                        </span>
                        {currentFeatured.volume && (
                          <>
                            <span className="text-[#dcd5c7] shrink-0 font-bold">•</span>
                            <span className="text-[10px] text-[#27272a] font-bold shrink-0">
                              {currentFeatured.volume}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Title locked to 2-line height so 1-line and 2-line titles take identical height */}
                      <div className="h-[2.85rem] flex items-start overflow-hidden">
                        <h3 className="font-serif text-base sm:text-lg font-bold text-[#09090b] group-hover:text-[#7a5828] transition-colors line-clamp-2 leading-snug break-words">
                          {currentFeatured.nome}
                        </h3>
                      </div>

                      {/* Family locked to 18px */}
                      <div className="h-[18px] mt-0.5 overflow-hidden">
                        {currentFeatured.familiaOlfativa ? (
                          <p className="text-[11px] text-[#27272a] font-medium line-clamp-1 truncate">
                            Família: <span className="text-[#09090b] font-bold">{currentFeatured.familiaOlfativa}</span>
                          </p>
                        ) : (
                          <span className="block h-[18px]" />
                        )}
                      </div>
                    </div>

                    {/* Notes Pills locked to 1 row (no flex-wrap) */}
                    <div className="flex items-center gap-1 mt-1 min-w-0 overflow-hidden h-[24px]">
                      {featuredAcordes.length > 0 ? (
                        featuredAcordes.slice(0, 3).map((acorde, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-[#f5ede2] text-[#543b18] border border-[#e2d8c5] px-2 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0 shadow-2xs"
                          >
                            {acorde}
                          </span>
                        ))
                      ) : (
                        <span className="block h-[24px]" />
                      )}
                    </div>

                    {/* Price locked to 24px */}
                    <div className="mt-1 flex items-baseline gap-2 shrink-0 h-[24px]">
                      <span className="text-xl font-extrabold text-[#09090b] leading-none">
                        {currentFeatured.precoVista.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <span className="text-xs text-[#27272a] font-medium">à vista</span>
                    </div>
                  </div>
                </div>

                {/* Mini Thumbnails Selector */}
                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-[#dcd5c7] w-full min-w-0">
                  {heroFeaturedProducts.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => setFeaturedIndex(idx)}
                      className={`p-1.5 rounded-lg border text-left transition-all flex items-center gap-1.5 min-w-0 overflow-hidden cursor-pointer ${
                        idx === featuredIndex
                          ? 'border-2 border-[#09090b] bg-[#fbf9f5] shadow-xs'
                          : 'border-[#dcd5c7] hover:border-[#09090b] opacity-80 hover:opacity-100 bg-white'
                      }`}
                    >
                      <div className="w-6 h-6 rounded bg-white shrink-0 overflow-hidden border border-[#dcd5c7]">
                        <ProductImage src={p.fotos[0]?.url} alt="" className="w-full h-full object-contain" />
                      </div>
                      <span className="text-[10px] font-bold text-[#09090b] truncate min-w-0 hidden sm:inline">
                        {p.marca.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => chooseProduct(currentFeatured)}
                  className="w-full bg-[#09090b] hover:bg-black text-white py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
                >
                  <Sparkles size={14} className="text-[#e8cda8]" />
                  Ver Pirâmide Olfativa & Detalhes
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
      </>}
      <section id="produtos" className="shell catalog-section">
        <div className="catalog-title"><div><p className="breadcrumb">Catálogo{activeCategory !== 'todos' ? ' / '+activeCategory : ''}</p><CatalogHeading>{searchTerm.trim() ? 'Resultados da busca' : activeCategory === 'todos' ? 'Explore o catálogo' : activeCategory === 'promocoes' ? 'Ofertas para descobrir' : activeCategory}</CatalogHeading></div><span role="status">{filteredProdutos.length} {filteredProdutos.length === 1 ? 'produto' : 'produtos'}</span></div>
        <div className="catalog-toolbar">
          <div className="availability-tabs" aria-label="Disponibilidade">
            {(['TODOS','PRONTA_ENTREGA','ENCOMENDA'] as const).map(value=><button key={value} aria-pressed={availabilityFilter===value} onClick={()=>{setAvailabilityFilter(value);setVisibleCount(12);}}>{value==='TODOS'?'Todos':value==='PRONTA_ENTREGA'?'Pronta entrega':'Sob encomenda'}</button>)}
          </div>
          <button className="filter-toggle" aria-expanded={filtersOpen} aria-controls="catalog-filters" onClick={()=>setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={17}/> Filtros</button>
          <label className="sort-control">Ordenar por <select value={sortBy} onChange={e=>setSortBy(e.target.value as typeof sortBy)}><option value="mais-vendidos">Mais vendidos</option><option value="novidades">Novidades</option><option value="menor-preco">Menor preço</option><option value="maior-preco">Maior preço</option></select></label>
        </div>
        <div id="catalog-filters" className={'catalog-filters '+(filtersOpen?'is-open':'')}>
          <label>Categoria<select value={activeCategory} onChange={e=>{setActiveCategory(e.target.value);setVisibleCount(12);}}><option value="todos">Todas as categorias</option>{sortedCategorias.map(c=><option key={c.id} value={c.nome}>{c.nome}</option>)}<option value="promocoes">Ofertas</option></select></label>
          <label>Marca<select value={selectedBrand} onChange={e=>{setSelectedBrand(e.target.value);setVisibleCount(12);}}><option value="todas">Todas as marcas</option>{brandsList.map(b=><option key={b}>{b}</option>)}</select></label>
          <label>Faixa de preço<select value={priceRange} onChange={e=>{setPriceRange(e.target.value);setVisibleCount(12);}}><option value="todos">Todos os preços</option><option value="ate-100">Até R$ 100</option><option value="100-200">R$ 100 a R$ 200</option><option value="acima-200">Acima de R$ 200</option></select></label>
          <label className="promo-check"><input type="checkbox" checked={onlyPromos} onChange={e=>setOnlyPromos(e.target.checked)} /> Somente ofertas</label>
        </div>
        {hasFilters && <div className="active-filters"><span>{searchTerm.trim() ? 'Busca: “'+searchTerm.trim()+'”' : 'Filtros aplicados'}{selectedBrand!=='todas'?' · '+selectedBrand:''}{priceRange!=='todos'?' · Faixa de preço selecionada':''}</span><button onClick={clearFilters}>Limpar filtros <X size={14}/></button></div>}
        {/* GRID DE PRODUTOS */}
        {filteredProdutos.length > 0 ? (
          <div className="product-grid">
            {filteredProdutos.slice(0,visibleCount).map(produto => (
              <ProductCard 
                key={produto.id}
                produto={produto}
                isFavorited={favorites.includes(produto.id)}
                onToggleFavorite={toggleFavorite}
                onSelectProduct={chooseProduct}
                onAddToCart={addToCart}
                onBuyWhatsApp={buyDirectOnWhatsApp}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white border-2 border-[#dcd5c7] rounded-2xl p-12 text-center max-w-md mx-auto my-8 shadow-xs">
            <div className="w-16 h-16 bg-[#faf8f5] border border-[#dcd5c7] rounded-full flex items-center justify-center mx-auto mb-4 text-[#09090b]">
              <Search size={24} />
            </div>
            <h4 className="text-base font-bold text-[#09090b] mb-1">Nenhum produto encontrado</h4>
            <p className="text-xs text-[#27272a] font-medium mb-5">
              Não encontramos resultados com esses filtros. Experimente trocar a disponibilidade ou limpar os filtros.
            </p>
            <button 
              onClick={clearFilters}
              className="bg-[#09090b] text-white text-xs font-bold px-6 py-2.5 rounded-full hover:bg-[#27272a] transition-all shadow-xs cursor-pointer"
            >
              Ver todos os produtos
            </button>
          </div>
        )}

        {filteredProdutos.length > visibleCount && <div className="load-more"><p>Mostrando {visibleCount} de {filteredProdutos.length} produtos</p><button className="button-secondary" onClick={()=>setVisibleCount(n=>n+12)}>Ver mais produtos <Plus size={16}/></button></div>}
      </section>

      <section id="secao-encomenda-customizada" className="order-section shell">
        <div className="order-intro">
          <h2>Seu próximo favorito,<br/>sob encomenda.</h2>
          <p>Não encontrou o que procura? Consulte a disponibilidade do seu perfume ou cosmético importado com nosso atendimento.</p>
        </div>
        <div className="order-steps">
          <div><span>01</span><h3>Conte o que procura</h3><p>Envie o nome, a marca e o volume do produto.</p></div>
          <div><span>02</span><h3>Receba seu orçamento</h3><p>Consulte o valor e o prazo de chegada pelo WhatsApp.</p></div>
          <div><span>03</span><h3>50% agora, 50% na entrega</h3><p>Reserve com o sinal e pague o restante ao receber.</p></div>
        </div>
        <form className="order-form" onSubmit={e => {
          e.preventDefault();
          openCustomOrderModal(customEncomendaQuery);
        }}>
          <label htmlFor="custom-order">Qual produto você gostaria de encomendar?</label>
          <div>
            <input 
              id="custom-order" 
              value={customEncomendaQuery} 
              onChange={e => setCustomEncomendaQuery(e.target.value)} 
              placeholder="Ex.: Dior Sauvage, 100 ml"
            />
            <button className="button-primary cursor-pointer flex items-center justify-center gap-2" type="submit">
              <Sparkles size={16} /> Solicitar orçamento
            </button>
          </div>
        </form>
      </section>
      </main>
      {/* 7. MODAL DETALHADO DO PRODUTO */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="product-title" tabIndex={-1} className="product-dialog relative w-full bg-white z-10 my-auto"
            >
              <button 
                aria-label="Fechar detalhes" onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white shadow-xs border border-[#dcd5c7] text-[#09090b] flex items-center justify-center hover:bg-[#faf8f5] hover:border-[#09090b] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="product-detail p-5 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-10 items-start">
                
                {/* FOTO E GALERIA */}
                <div className="order-2 md:order-1 md:col-span-7 flex flex-col gap-4">
                  <div className="space-y-2.5">
                    <div 
                      onClick={() => {
                        setIsPhotoZoomOpen(true);
                        setCatalogZoomScale(1);
                      }}
                      title="Clique para ampliar a foto do produto"
                      className="aspect-square rounded-2xl bg-[#fcfbf9] overflow-hidden relative border-2 border-[#dcd5c7] cursor-zoom-in group/mainphoto"
                    >
                      <ProductImage 
                        src={selectedProduct.fotos[activeImageIndex]?.url || selectedProduct.fotos[0]?.url} 
                        alt={selectedProduct.nome}
                        className="w-full h-full object-contain object-center p-6 sm:p-8 group-hover/mainphoto:scale-105 transition-transform duration-200"
                      />
                      
                      {/* Badge de Modalidade */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
                        {isProdutoProntaEntrega(selectedProduct) ? (
                          <span className="bg-emerald-800 text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md flex items-center gap-1 shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Pronta Entrega
                          </span>
                        ) : (
                          <span className="bg-[#7a5828] text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md flex items-center gap-1 shadow-xs">
                            <CalendarCheck size={12} />
                            Sob Encomenda
                          </span>
                        )}
                        {selectedProduct.badge && (
                          <span className="bg-[#09090b] text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md shadow-xs">
                            {selectedProduct.badge}
                          </span>
                        )}
                      </div>

                      {/* Hint de Zoom */}
                      <div className="absolute bottom-3 right-3 bg-black/60 group-hover/mainphoto:bg-black/85 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1 transition-colors pointer-events-none shadow-xs">
                        <ZoomIn size={12} /> Ampliar
                      </div>
                    </div>

                    {selectedProduct.fotos.length > 1 && (
                      <div className="flex gap-2">
                        {selectedProduct.fotos.map((foto, idx) => (
                          <button 
                            key={foto.id || idx}
                            aria-label={"Ver foto "+(idx+1)} aria-pressed={activeImageIndex===idx} onClick={() => setActiveImageIndex(idx)}
                            className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                              activeImageIndex === idx ? 'border-[#09090b] shadow-xs' : 'border-[#dcd5c7] opacity-70 hover:opacity-100 hover:border-[#09090b]'
                            }`}
                          >
                            <ProductImage src={foto.url} alt="" className="w-full h-full object-contain" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* GUIA DE USO & RENDIMENTO */}
                  {(() => {
                    const isMini = Boolean(selectedProduct.categoria?.nome?.toLowerCase().includes('mini') || (selectedProduct.volume && selectedProduct.volume.includes('25ml')));
                    const isPerf = Boolean(selectedProduct.categoria?.nome?.toLowerCase().includes('perfume') || (selectedProduct.volume && (selectedProduct.volume.includes('80ml') || selectedProduct.volume.includes('90ml') || selectedProduct.volume.includes('100ml'))));
                    const isSplash = Boolean(selectedProduct.categoria?.nome?.toLowerCase().includes('splash') || selectedProduct.nome?.toLowerCase().includes('splash'));
                    
                    return (
                      <div className="rounded-2xl border border-[#dcd5c7] bg-[#fbf9f5] p-3.5 sm:p-4 space-y-2.5">
                        <div className="flex items-center justify-between pb-2 border-b border-[#dcd5c7]">
                          <div className="flex items-center gap-1.5">
                            <Sparkles size={14} className="text-[#7a5828]" />
                            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#09090b]">
                              Guia Prático & Rendimento
                            </h4>
                          </div>
                          <span className="text-[10px] font-bold text-[#543b18] bg-[#f5ede2] border border-[#dcd5c7] px-2 py-0.5 rounded">
                            {selectedProduct.volume || 'Alta Performance'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {/* Item 1: Concentração e Fixação */}
                          <div className="bg-white rounded-xl p-2.5 border border-[#dcd5c7] flex flex-col justify-between shadow-2xs">
                            <span className="text-[10px] text-[#27272a] uppercase font-bold tracking-wide">
                              {isMini || isPerf ? 'Concentração' : 'Sensação'}
                            </span>
                            <p className="text-xs font-bold text-[#09090b] mt-0.5">
                              {isMini ? 'Eau de Parfum (EDP)' : isPerf ? (selectedProduct.concentracao || 'Eau de Parfum') : isSplash ? 'Bruma Refrescante' : 'Hidratação 24h'}
                            </p>
                            <span className="text-[10px] text-[#7a5828] font-bold mt-1">
                              {isMini || isPerf ? 'Fixação prolongada (6h a 8h)' : isSplash ? 'Toque leve & perfumado' : 'Manteiga de Karité & Coco'}
                            </span>
                          </div>

                          {/* Item 2: Rendimento */}
                          <div className="bg-white rounded-xl p-2.5 border border-[#dcd5c7] flex flex-col justify-between shadow-2xs">
                            <span className="text-[10px] text-[#27272a] uppercase font-bold tracking-wide">
                              Rendimento
                            </span>
                            <p className="text-xs font-bold text-[#09090b] mt-0.5">
                              {isMini ? '~350 a 400 borrifadas' : isPerf ? '~1.200 a 1.500 borrifadas' : isSplash ? '~3.000 borrifadas' : '~60 a 90 aplicações'}
                            </p>
                            <span className="text-[10px] text-emerald-800 font-bold mt-1">
                              {isMini ? 'Dura até 3 meses de uso diário' : isPerf ? 'Dura mais de 1 ano' : isSplash ? 'Uso generoso pós-banho' : 'Absorção rápida e maciez'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* DETALHES */}
                <div className="order-1 md:order-2 md:col-span-5 flex flex-col">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1.5 pr-12">
                      <span className="text-xs uppercase font-extrabold tracking-wider text-[#7a5828]">
                        {selectedProduct.marca}
                      </span>
                      <span className="text-[#dcd5c7] font-bold">•</span>
                      <span className="text-xs text-[#27272a] font-semibold">
                        {selectedProduct.categoria.nome}
                      </span>
                    </div>

                    <h2 id="product-title" className="text-2xl font-serif font-bold text-[#09090b] mb-1.5 leading-snug pr-10">
                      {selectedProduct.nome}
                    </h2>

                    {selectedProduct.volume && (
                      <p className="text-xs text-[#27272a] mb-3 font-medium">
                        Volume / Quantidade: <span className="font-bold text-[#09090b]">{selectedProduct.volume}</span>
                      </p>
                    )}

                    {/* STATUS DE ENTREGA DETALHADO */}
                    <div className={`detail-availability p-3.5 rounded-xl border-2 mb-3 text-xs ${
                      isProdutoProntaEntrega(selectedProduct)
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium'
                        : 'bg-[#fcf7ee] border-[#e8d7be] text-[#543b18] font-medium'
                    }`}>
                      <div className="font-extrabold flex items-center gap-1.5 mb-0.5">
                        {isProdutoProntaEntrega(selectedProduct) ? (
                          <><CheckCircle2 size={16} className="text-emerald-700"/> Pronta entrega imediata</>
                        ) : (
                          <><CalendarCheck size={16} className="text-[#7a5828]"/> Disponível sob encomenda</>
                        )}
                      </div>
                      <p className="text-[#27272a] font-medium">
                        {selectedProduct.previsaoEntrega || (
                          isProdutoProntaEntrega(selectedProduct)
                            ? 'Envio ou retirada combinada de imediato.'
                            : 'Traga seu cosmético dos sonhos no próximo lote com a gente.'
                        )}
                      </p>
                    </div>

                    {/* PREÇOS */}
                    <div className="detail-price py-2 mb-3">
                      <div className="flex items-baseline gap-2">
                        {selectedProduct.precoOriginal && selectedProduct.precoOriginal > selectedProduct.precoVista && (
                          <span className="text-xs text-[#52525b] line-through font-semibold">
                            De {selectedProduct.precoOriginal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        )}
                        <span className="text-2xl font-extrabold text-[#09090b]">
                          {selectedProduct.precoVista.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <span className="text-xs text-[#27272a] font-semibold">à vista</span>
                      </div>
                      {selectedProduct.precoParcelado && (
                        <p className="text-xs text-[#7a5828] font-bold mt-0.5">
                          {selectedProduct.precoParcelado}
                        </p>
                      )}
                    </div>

                    {/* BOTAO DE ACAO DINAMICO (PRONTA ENTREGA vs ENCOMENDA) */}
                    <div className="detail-actions space-y-2.5 pt-3 mb-4 border-t border-[#dcd5c7]">
                      <button 
                        onClick={() => buyDirectOnWhatsApp(selectedProduct)}
                        className={`w-full text-white py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-xs ${
                          isProdutoProntaEntrega(selectedProduct)
                            ? 'bg-[#09090b] hover:bg-[#27272a]'
                            : 'bg-[#7a5828] hover:bg-[#63451e]'
                        }`}
                      >
                        <MessageCircle size={18} />
                        {isProdutoProntaEntrega(selectedProduct)
                          ? 'Reservar pelo WhatsApp'
                          : 'Fazer Encomenda pelo WhatsApp'}
                      </button>
                      
                      <button 
                        onClick={() => {
                          addToCart(selectedProduct);
                          setSelectedProduct(null);
                        }}
                        className="w-full bg-white hover:bg-[#faf8f5] text-[#09090b] border-2 border-[#09090b] py-3 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                      >
                        <ShoppingBag size={16} /> Adicionar à Sacola
                      </button>
                    </div>
                  </div>

                  {/* DESCRIÇÃO E USO */}
                  <div className="space-y-2 text-xs text-[#27272a] leading-relaxed pt-5 mt-2 border-t border-[#dcd5c7]">
                    <div>
                      <h4 className="font-bold text-[#09090b] uppercase tracking-wider text-[11px] mb-0.5">Descrição:</h4>
                      <p>{selectedProduct.descricao}</p>
                    </div>

                    {selectedProduct.caracteristicas && (
                      <div>
                        <h4 className="font-bold text-[#09090b] uppercase tracking-wider text-[11px] mb-0.5">Destaques:</h4>
                        <p className="text-[#3f3f46] font-medium">{selectedProduct.caracteristicas}</p>
                      </div>
                    )}

                    {selectedProduct.modoUso && (
                      <div>
                        <h4 className="font-bold text-[#09090b] uppercase tracking-wider text-[11px] mb-0.5">Modo de Uso:</h4>
                        <p className="text-[#3f3f46] font-medium">{selectedProduct.modoUso}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* PERFIL DA FRAGRÂNCIA (SEÇÃO NOBRE LARGURA TOTAL) */}
              {(selectedProduct.familiaOlfativa || selectedProduct.acordesPrincipais || selectedProduct.notasSaida) && (
                <div className="bg-[#fcfbf9] border-t-2 border-[#dcd5c7] p-5 sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-[#dcd5c7]">
                    <div className="flex items-center gap-2">
                      <Sparkles className="text-[#7a5828]" size={18} />
                      <h4 className="font-serif text-[#09090b] text-lg font-bold">Perfil da Fragrância & Pirâmide Olfativa</h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {selectedProduct.familiaOlfativa && (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#543b18] bg-[#f5ede2] border border-[#dcd5c7] px-3 py-1 rounded-md">
                          {selectedProduct.familiaOlfativa}
                        </span>
                      )}
                      {selectedProduct.concentracao && (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#09090b] bg-[#fbf9f5] border border-[#dcd5c7] px-3 py-1 rounded-md">
                          {selectedProduct.concentracao}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-5">
                    {/* Acordes Principais */}
                    {selectedProduct.acordesPrincipais && Array.isArray(selectedProduct.acordesPrincipais) && selectedProduct.acordesPrincipais.length > 0 && (
                      <div>
                        <p className="text-[11px] uppercase font-bold text-[#09090b] tracking-wider mb-2">Acordes Principais</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedProduct.acordesPrincipais.filter((value): value is string => typeof value === 'string').map((acorde: string, idx: number) => (
                            <span key={idx} className="text-xs text-[#09090b] font-semibold border border-[#dcd5c7] bg-white px-3 py-1 rounded-full shadow-2xs">
                              {acorde}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pirâmide Olfativa em 3 Colunas Horizontais */}
                    {[selectedProduct.notasSaida, selectedProduct.notasCoracao, selectedProduct.notasFundo].some(notes => Array.isArray(notes) && notes.length > 0) && (
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <p className="text-[11px] uppercase font-bold text-[#09090b] tracking-wider">Evolução Olfativa na Pele</p>
                          <span className="text-[10px] text-[#27272a] font-medium italic">Fases médias de referência olfativa</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Topo */}
                          <div className="bg-white border-1.5 border-[#dcd5c7] rounded-xl p-3.5 flex flex-col justify-between shadow-2xs">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-[#09090b]">Notas de Topo (Saída)</span>
                                <span className="text-[10px] text-[#543b18] font-bold bg-[#f5ede2] border border-[#dcd5c7] px-2 py-0.5 rounded" title="Média de evaporação na perfumaria">~5 a 15 min</span>
                              </div>
                              <p className="text-xs text-[#27272a] font-medium leading-relaxed">
                                {selectedProduct.notasSaida && Array.isArray(selectedProduct.notasSaida) && selectedProduct.notasSaida.length > 0
                                  ? selectedProduct.notasSaida.join(' • ')
                                  : 'Acordes frescos de abertura'}
                              </p>
                            </div>
                            <small className="text-[10px] text-[#3f3f46] font-medium mt-3">A primeira impressão que você sente ao borrifar</small>
                          </div>

                          {/* Coração */}
                          <div className="bg-white border-1.5 border-[#dcd5c7] rounded-xl p-3.5 flex flex-col justify-between shadow-2xs">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-[#09090b]">Notas de Coração (Corpo)</span>
                                <span className="text-[10px] text-[#543b18] font-bold bg-[#f5ede2] border border-[#dcd5c7] px-2 py-0.5 rounded" title="Média de evaporação na perfumaria">~2 a 4 horas</span>
                              </div>
                              <p className="text-xs text-[#27272a] font-medium leading-relaxed">
                                {selectedProduct.notasCoracao && Array.isArray(selectedProduct.notasCoracao) && selectedProduct.notasCoracao.length > 0
                                  ? selectedProduct.notasCoracao.join(' • ')
                                  : 'Alma e personalidade marcante'}
                              </p>
                            </div>
                            <small className="text-[10px] text-[#3f3f46] font-medium mt-3">A essência e personalidade que exala no ambiente</small>
                          </div>

                          {/* Fundo */}
                          <div className="bg-white border-1.5 border-[#dcd5c7] rounded-xl p-3.5 flex flex-col justify-between shadow-2xs">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-[#09090b]">Notas de Fundo (Base)</span>
                                <span className="text-[10px] text-[#543b18] font-bold bg-[#f5ede2] border border-[#dcd5c7] px-2 py-0.5 rounded" title="Média de evaporação na perfumaria">~6+ horas</span>
                              </div>
                              <p className="text-xs text-[#27272a] font-medium leading-relaxed">
                                {selectedProduct.notasFundo && Array.isArray(selectedProduct.notasFundo) && selectedProduct.notasFundo.length > 0
                                  ? selectedProduct.notasFundo.join(' • ')
                                  : 'Fixação duradoura e aconchegante'}
                              </p>
                            </div>
                            <small className="text-[10px] text-[#3f3f46] font-medium mt-3">As notas mais nobres que duram o dia todo na pele</small>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* VOCE TAMBEM PODE GOSTAR */}
              {relatedProducts.length > 0 && (
                <div className="bg-[#fcfbf9] border-t-2 border-[#dcd5c7] p-5 sm:p-6">
                  <h4 className="text-sm font-serif font-bold text-[#09090b] mb-3">Você também pode gostar:</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {relatedProducts.map(rel => (
                      <div 
                        key={rel.id} 
                        role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();chooseProduct(rel);}}} onClick={() => chooseProduct(rel)}
                        className="bg-white p-2.5 rounded-xl border border-[#dcd5c7] cursor-pointer hover:border-[#09090b] transition-all flex flex-col shadow-2xs hover:shadow-xs"
                      >
                        <div className="aspect-square rounded-lg bg-[#f7f4ef] overflow-hidden mb-2 border border-[#dcd5c7]">
                          <ProductImage src={rel.fotos[0]?.url} alt="" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-[10px] text-[#7a5828] font-extrabold uppercase truncate">{rel.marca}</span>
                        <p className="text-xs font-bold text-[#09090b] truncate mb-1">{rel.nome}</p>
                        <span className="text-xs font-extrabold text-[#09090b] mt-auto">
                          {rel.precoVista.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LIGHTBOX / ZOOM DA FOTO DO PRODUTO */}
      <AnimatePresence>
        {isPhotoZoomOpen && selectedProduct && (
          <div 
            className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
            onClick={() => {
              setIsPhotoZoomOpen(false);
              setCatalogZoomScale(1);
            }}
          >
            {/* Top Bar Controls */}
            <div 
              className="w-full max-w-2xl flex items-center justify-between pb-3 z-30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <span className="text-white/80 text-xs font-semibold flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15">
                  <Sparkles size={13} className="text-[#c5a880]" />
                  {selectedProduct.marca} • Detalhes do Frasco
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCatalogZoomScale((prev) => (prev > 1 ? 1 : 2))}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                  title={catalogZoomScale > 1 ? "Reduzir zoom" : "Ampliar zoom"}
                >
                  {catalogZoomScale > 1 ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
                  <span>{catalogZoomScale > 1 ? "Zoom 1x" : "Zoom 2x"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPhotoZoomOpen(false);
                    setCatalogZoomScale(1);
                  }}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Fechar ampliação"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Container da Imagem */}
            <div 
              className="relative w-full max-w-2xl max-h-[65vh] min-h-[320px] bg-[#121214]/90 border border-white/15 rounded-3xl p-6 sm:p-10 flex items-center justify-center overflow-hidden shadow-2xl cursor-pointer select-none"
              onClick={(e) => {
                e.stopPropagation();
                setCatalogZoomScale((prev) => (prev > 1 ? 1 : 2));
              }}
              title="Clique na foto para alternar entre 1x e 2x de zoom"
            >
              <img
                src={selectedProduct.fotos[activeImageIndex]?.url || selectedProduct.fotos[0]?.url}
                alt={selectedProduct.nome}
                style={{
                  transform: `scale(${catalogZoomScale})`,
                  transition: "transform 0.25s cubic-bezier(0.2, 0, 0, 1)",
                }}
                className={`max-h-[55vh] max-w-full object-contain drop-shadow-2xl ${
                  catalogZoomScale > 1 ? "cursor-zoom-out" : "cursor-zoom-in"
                }`}
              />

              <div className="absolute bottom-3 right-4 pointer-events-none bg-black/60 border border-white/15 text-[10px] text-white/80 px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1">
                <ZoomIn size={11} /> Toque para alternar zoom (1x / 2x)
              </div>
            </div>

            {/* Bottom Bar Info */}
            <div 
              className="w-full max-w-2xl bg-[#1c1c1f] border border-white/15 rounded-2xl p-4 mt-3 flex items-center justify-between gap-3 shadow-2xl z-30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-left min-w-0">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-[#c5a880] block">
                  {selectedProduct.marca}
                </span>
                <h4 className="font-serif text-sm sm:text-base font-bold text-white truncate">
                  {selectedProduct.nome}
                </h4>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-extrabold text-[#c5a880]">
                  {selectedProduct.precoVista.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. DRAWER DA SACOLA */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              ref={dialogRef} role="dialog" aria-modal="true" aria-label="Sacola" tabIndex={-1} className="catalog-drawer relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col border-l-2 border-[#dcd5c7]"
            >
              <div className="p-5 border-b border-[#dcd5c7] flex items-center justify-between bg-white">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={20} className="text-[#09090b]" />
                  <h3 className="font-serif text-lg font-bold text-[#09090b]">Sua Sacola ({cartTotalItems})</h3>
                </div>
                <button 
                  aria-label="Fechar sacola" onClick={() => setIsCartOpen(false)}
                  className="p-2 rounded-full hover:bg-[#faf8f5] text-[#09090b] transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-16 text-[#3f3f46]">
                    <div className="w-16 h-16 bg-[#faf8f5] border border-[#dcd5c7] rounded-full flex items-center justify-center mx-auto mb-3 text-[#09090b]">
                      <ShoppingBag size={24} />
                    </div>
                    <p className="text-sm font-bold text-[#09090b] mb-1">Sua sacola está vazia</p>
                    <p className="text-xs text-[#27272a] font-medium">Explore nossos itens a pronta entrega e sob encomenda.</p>
                  </div>
                ) : (
                  cart.map(({ produto, qtd }) => (
                    <div key={produto.id} className="flex gap-3 bg-[#fcfbf9] p-3 rounded-2xl border border-[#dcd5c7] shadow-2xs">
                      <div className="w-16 h-20 rounded-xl bg-white overflow-hidden shrink-0 border border-[#dcd5c7]">
                        <ProductImage src={produto.fotos[0]?.url} alt="" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-0.5">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[#7a5828] uppercase font-extrabold">{produto.marca}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              isProdutoProntaEntrega(produto) 
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                                : 'bg-[#f5ede2] text-[#543b18] border border-[#dcd5c7]'
                            }`}>
                              {isProdutoProntaEntrega(produto) ? 'Pronta Entrega' : 'Encomenda'}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-[#09090b] line-clamp-1">{produto.nome}</h4>
                          <span className="text-xs font-extrabold text-[#09090b]">
                            {produto.precoVista.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center border border-[#dcd5c7] bg-white rounded-full">
                            <button aria-label={"Diminuir quantidade de "+produto.nome} onClick={() => updateCartQtd(produto.id, -1)} className="p-1 px-2 text-xs hover:bg-[#faf8f5] rounded-l-full text-[#09090b] font-bold cursor-pointer">
                              <Minus size={11} />
                            </button>
                            <span className="text-xs font-bold text-[#09090b] px-2">{qtd}</span>
                            <button aria-label={"Aumentar quantidade de "+produto.nome} onClick={() => updateCartQtd(produto.id, 1)} className="p-1 px-2 text-xs hover:bg-[#faf8f5] rounded-r-full text-[#09090b] font-bold cursor-pointer">
                              <Plus size={11} />
                            </button>
                          </div>
                          <button onClick={() => removeFromCart(produto.id)} className="text-xs text-red-600 hover:text-red-800 font-bold cursor-pointer">
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-5 border-t border-[#dcd5c7] bg-[#fcfbf9]">
                  <div className="flex justify-between items-center text-xs text-[#27272a] font-medium mb-1">
                    <span>Subtotal</span>
                    <span className="font-bold text-[#09090b]">{cartTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-[#27272a] font-medium mb-3">
                    <span>Entrega e Prazos</span>
                    <span className="text-emerald-800 font-bold">A combinar</span>
                  </div>
                  <div className="flex justify-between items-center text-base font-extrabold text-[#09090b] pt-2 border-t border-[#dcd5c7] mb-4">
                    <span>Total Estimado</span>
                    <span>{cartTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  <button 
                    onClick={checkoutCartOnWhatsApp}
                    className="w-full bg-[#15803d] hover:bg-[#166534] text-white py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
                  >
                    <MessageCircle size={18} /> Enviar Pedido no WhatsApp
                  </button>
                  <p className="text-[11px] text-center text-[#3f3f46] font-medium mt-2.5">
                    Você enviará a lista detalhada para combinarmos entrega ou prazos de encomenda.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. DRAWER DE FAVORITOS */}
      <AnimatePresence>
        {isFavoritesOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFavoritesOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              ref={dialogRef} role="dialog" aria-modal="true" aria-label="Favoritos" tabIndex={-1} className="catalog-drawer relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col border-l-2 border-[#dcd5c7]"
            >
              <div className="p-5 border-b border-[#dcd5c7] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart size={20} className="text-[#7a5828] fill-[#7a5828]" />
                  <h3 className="font-serif text-lg font-bold text-[#09090b]">Meus Favoritos ({favorites.length})</h3>
                </div>
                <button aria-label="Fechar favoritos" onClick={() => setIsFavoritesOpen(false)} className="p-2 rounded-full hover:bg-[#faf8f5] text-[#09090b] cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {favorites.length === 0 ? (
                  <div className="text-center py-16 text-[#3f3f46]">
                    <div className="w-16 h-16 bg-[#faf8f5] border border-[#dcd5c7] rounded-full flex items-center justify-center mx-auto mb-3 text-[#7a5828]">
                      <Heart size={28} />
                    </div>
                    <p className="text-sm font-bold text-[#09090b]">Nenhum item favoritado ainda</p>
                    <p className="text-xs text-[#27272a] font-medium mt-1">Toque no coração dos produtos para salvá-los aqui.</p>
                  </div>
                ) : (
                  initialProdutos.filter(p => favorites.includes(p.id)).map(fav => (
                    <div key={fav.id} className="flex items-center gap-3 bg-[#fcfbf9] p-3 rounded-2xl border border-[#dcd5c7] shadow-2xs">
                      <div className="w-14 h-16 rounded-xl bg-white overflow-hidden shrink-0 border border-[#dcd5c7]">
                        <ProductImage src={fav.fotos[0]?.url} alt="" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] text-[#7a5828] uppercase font-extrabold">{fav.marca}</span>
                        <h4 className="text-xs font-bold text-[#09090b] line-clamp-1">{fav.nome}</h4>
                        <span className="text-xs font-extrabold text-[#09090b]">
                          {fav.precoVista.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={() => buyDirectOnWhatsApp(fav)}
                          className="p-2 bg-[#15803d] hover:bg-[#166534] text-white rounded-full cursor-pointer shadow-2xs"
                          title="Falar no WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </button>
                        <button 
                          onClick={() => toggleFavorite(fav.id)}
                          className="p-2 text-[#3f3f46] hover:text-red-600 rounded-full cursor-pointer"
                          title="Remover"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9.5. MODAL DE ENCOMENDA PERSONALIZADA */}
      <CustomOrderModal
        isOpen={isCustomOrderOpen}
        onClose={() => setIsCustomOrderOpen(false)}
        initialValue={customOrderInitialValue}
        whatsappPhone={WHATSAPP_PHONE}
      />

      {/* 10. BOTAO FLUTUANTE WHATSAPP */}
      <div className="contact-float fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40">
        <button
          onClick={() => generalWhatsAppContact()}
          className="group flex items-center gap-2 bg-[#15803d] hover:bg-[#166534] text-white p-3 md:px-4 md:py-3 rounded-full shadow-lg shadow-emerald-700/30 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          title="Fale conosco no WhatsApp"
        >
          <MessageCircle size={22} className="shrink-0" />
          <span className="hidden md:inline text-xs font-bold tracking-wide">
            Dúvidas & Encomendas
          </span>
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
        </button>
      </div>

      {/* 11. DOCK DE NAVEGAÇÃO MOBILE (FIXO NA PARTE INFERIOR) */}
      <div className="mobile-dock md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-[#dcd5c7] px-2 py-2 flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <button 
          onClick={() => {
            clearFilters();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
            availabilityFilter === 'TODOS' && activeCategory === 'todos' ? 'text-[#09090b] font-bold' : 'text-[#3f3f46]'
          }`}
        >
          <Home size={19} />
          <span className="text-[10px] font-semibold">Início</span>
        </button>

        <button 
          onClick={() => {
            setAvailabilityFilter('PRONTA_ENTREGA');
            const el = document.getElementById('produtos');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
            availabilityFilter === 'PRONTA_ENTREGA' ? 'text-emerald-800 font-bold' : 'text-[#3f3f46]'
          }`}
        >
          <div className="relative">
            <CheckCircle2 size={19} className={availabilityFilter === 'PRONTA_ENTREGA' ? 'text-emerald-800' : ''} />
            <span className="absolute -top-1 -right-2 bg-emerald-700 text-white text-[8px] font-bold px-1 rounded-full">
              {prontaEntregaCount}
            </span>
          </div>
          <span className="text-[10px] font-semibold">Pronta Ent.</span>
        </button>

        <button 
          onClick={() => {
            setAvailabilityFilter('ENCOMENDA');
            const el = document.getElementById('produtos');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
            availabilityFilter === 'ENCOMENDA' ? 'text-[#7a5828] font-bold' : 'text-[#3f3f46]'
          }`}
        >
          <div className="relative">
            <CalendarCheck size={19} className={availabilityFilter === 'ENCOMENDA' ? 'text-[#7a5828]' : ''} />
            <span className="absolute -top-1 -right-2 bg-[#7a5828] text-white text-[8px] font-bold px-1 rounded-full">
              {encomendaCount}
            </span>
          </div>
          <span className="text-[10px] font-semibold">Encomenda</span>
        </button>

        <button 
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-colors text-[#3f3f46] hover:text-[#09090b] cursor-pointer"
        >
          <div className="relative">
            <ShoppingBag size={19} />
            {cartTotalItems > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-[#09090b] text-white text-[8px] font-bold px-1 rounded-full">
                {cartTotalItems}
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold">Sacola</span>
        </button>

        <button 
          onClick={() => generalWhatsAppContact()}
          className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-colors text-emerald-700 font-semibold cursor-pointer"
        >
          <MessageCircle size={19} className="text-[#15803d]" />
          <span className="text-[10px] font-bold text-emerald-800">WhatsApp</span>
        </button>
      </div>

      {/* 12. TOAST NOTIFICATION */}
      <div role="status" aria-live="polite" className={`catalog-toast fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        toast.show ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'
      }`}>
        <div className="bg-[#09090b] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 border border-white/20">
          <CheckCircle2 size={14} className="text-[#e8cda8]" />
          <span>{toast.message}</span>
        </div>
      </div>

      {/* 13. FOOTER */}
      <footer className="mt-auto bg-white border-t-2 border-[#dcd5c7] py-12 px-4 sm:px-6 lg:px-8 pb-28 md:pb-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div>
            <span className="text-xl font-serif tracking-[0.2em] font-medium text-[#09090b] block">
              ELEGANCE
            </span>
            <p className="text-xs text-[#27272a] font-medium mt-1">
              Catálogo de Cosméticos e Perfumes Importados • Pronta Entrega e Encomendas.
            </p>
          </div>
          <div className="text-xs text-[#27272a] font-medium space-y-1">
            <p>Atendimento exclusivo via WhatsApp • Pedidos e entregas sob consulta.</p>
            <p>© {new Date().getFullYear()} Elegance. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

    </div></MotionConfig>
  );
}

// COMPONENTE DO CARD DE PRODUTO INDIVIDUAL (COM DISTINÇÃO DE DISPONIBILIDADE E RESPONSIVIDADE MOBILE)
function ProductCard({
  produto,
  isFavorited,
  onToggleFavorite,
  onSelectProduct,
  onAddToCart,
  onBuyWhatsApp
}: {
  produto: Produto;
  isFavorited: boolean;
  onToggleFavorite: (id: number, e?: React.MouseEvent) => void;
  onSelectProduct: (p: Produto) => void;
  onAddToCart: (p: Produto, e?: React.MouseEvent) => void;
  onBuyWhatsApp: (p: Produto, e?: React.MouseEvent) => void;
}) {
  const isProntaEntrega = isProdutoProntaEntrega(produto);
  const hasDiscount = produto.precoOriginal && produto.precoOriginal > produto.precoVista;
  const discountPercent = hasDiscount 
    ? Math.round(((produto.precoOriginal! - produto.precoVista) / produto.precoOriginal!) * 100)
    : 0;

  return (
    <article className="product-card">
      <div className="product-visual">
        {hasDiscount ? <span className="product-badge">−{discountPercent}%</span> : produto.badge ? <span className="product-badge">{produto.badge}</span> : null}
        <button className="favorite-button" aria-label={(isFavorited?'Remover dos favoritos: ':'Favoritar: ')+produto.nome} aria-pressed={isFavorited} onClick={e=>onToggleFavorite(produto.id,e)}><Heart size={19} fill={isFavorited?'currentColor':'none'}/></button>
        <button className="product-photo" onClick={()=>onSelectProduct(produto)} aria-label={'Ver detalhes de '+produto.nome}><ProductImage src={produto.fotos[0]?.url} alt={produto.nome} loading="lazy"/><span>Ver detalhes <ArrowUpRight size={14}/></span></button>
      </div>
      <div className="product-info"><div className="product-meta"><span>{produto.marca}</span><span>{produto.volume}</span></div>
        <h3><button onClick={()=>onSelectProduct(produto)}>{produto.nome}</button></h3>
        <p className={'product-availability '+(isProntaEntrega?'in-stock':'')}>{isProntaEntrega?<Check size={13}/>:<Clock size={13}/>} {isProntaEntrega?'Pronta entrega':'Sob encomenda'}</p>
        <div className="product-pricing"><span className="original-price">{hasDiscount ? produto.precoOriginal!.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : ' '}</span><strong>{produto.precoVista.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong><small>{produto.precoParcelado || 'Consulte as condições de pagamento'}</small></div>
        <div className="product-actions"><button className="button-primary" onClick={e=>onBuyWhatsApp(produto,e)}><MessageCircle size={16}/>{isProntaEntrega?'Reservar':'Encomendar'}</button><button className="button-secondary" aria-label={'Adicionar à sacola: '+produto.nome} onClick={e=>onAddToCart(produto,e)}><ShoppingBag size={18}/></button></div>
      </div>
    </article>
  );
}

function ProductImage({src,alt,...props}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [failedSrc,setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc===src) return <span className={'image-placeholder '+(props.className || '')} role="img" aria-label={alt || 'Imagem indisponível'}><Sparkles size={28}/><span>Imagem indisponível</span></span>;
  // Existing local and remote images keep their URLs; no extra proxy or external dependency.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} src={src} alt={alt} decoding="async" onError={()=>setFailedSrc(typeof src==='string'?src:null)}/>;
}
