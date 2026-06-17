/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Leaf, 
  Coffee, 
  Utensils, 
  Moon, 
  IceCream, 
  ChevronRight, 
  Info,
  Clock,
  Instagram,
  Facebook,
  Phone,
  MapPin,
  Settings,
  X,
  RefreshCw,
  LogOut,
  AlertCircle,
  Home,
  Menu as MenuIcon,
  ShoppingBag,
  Search,
  Share2,
  Check
} from 'lucide-react';
import { initAuth, googleSignIn, logout } from './lib/auth';
import { fetchSpreadsheetData, fetchCSVData, SheetProduct, parseCSV } from './lib/sheets';
import { User } from 'firebase/auth';

// --- Cloudinary Optimization Helper ---
export function formatCloudinaryUrl(url: string, vertical: boolean = true): string {
  if (!url) return '';
  if (url.includes('cloudinary.com')) {
    const transform = vertical 
      ? 'w_600,h_750,c_fill,g_auto,q_auto,f_auto' 
      : 'w_1200,h_600,c_fill,g_auto,q_auto,f_auto';
      
    if (url.includes('/upload/')) {
      const uploadIdx = url.indexOf('/upload/');
      const prefix = url.substring(0, uploadIdx + 8);
      const suffix = url.substring(uploadIdx + 8);
      
      const match = suffix.match(/^([^\/]+)\//);
      if (match) {
        const firstSegment = match[1];
        const isVersion = /^v\d+$/.test(firstSegment) || (!firstSegment.includes(',') && !firstSegment.includes('_') && firstSegment.length > 8);
        if (isVersion) {
          return `${prefix}${transform}/${suffix}`;
        } else {
          return `${prefix}${transform}/${suffix.substring(firstSegment.length + 1)}`;
        }
      } else {
        return `${prefix}${transform}/${suffix}`;
      }
    }
  }
  return url;
}

// --- Types ---

interface RestaurantConfig {
  direccion: string;
  horario: string;
  instagram: string;
  facebook: string;
  telefono: string;
  wifiRed?: string;
  wifiClave?: string;
  bannerUrl?: string;
  logoUrl?: string;
}

interface MenuItem {
  id: string;
  seccion: string;
  category: string;
  name: string;
  descripcion: string;
  descripcion_corta: string;
  descripcion_larga: string;
  price: number;
  image: string;
  tags?: string[];
  destacado?: boolean;
  ingredientes?: string;
  beneficios?: string;
}

// --- Data ---

const MENU_ITEMS: MenuItem[] = [];

// --- Components ---

const CategoryPill = ({ id, name, active, onClick }: { 
  id: string; 
  name: string; 
  icon: any; 
  active: boolean; 
  onClick: () => void;
  key?: any;
}) => (
  <button
    id={`cat-${id}`}
    onClick={onClick}
    className={`pb-2 whitespace-nowrap transition-all duration-300 text-xs uppercase tracking-widest font-semibold border-b-2 ${
      active 
      ? 'text-[#ba6c28] border-[#ba6c28]' 
      : 'text-gray-400 hover:text-[#1A1A1A] border-transparent'
    }`}
  >
    {name}
  </button>
);

const SectionItem = ({ name, active, onClick }: { name: string; active: boolean; onClick: () => void; key?: any }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap font-bold text-[10px] uppercase tracking-wider ${
      active 
      ? 'bg-[#ba6c28] text-white shadow-md shadow-[#ba6c28]/20' 
      : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
    }`}
  >
    {name}
  </button>
);

const MenuItemCard = ({ item, onClick }: { item: MenuItem; onClick: () => void; key?: any }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    onClick={onClick}
    className="bg-white rounded-2xl overflow-hidden border border-gray-100 p-3 shadow-sm flex flex-col justify-between transition-all duration-300 active:scale-95 cursor-pointer group"
  >
    <div>
      <div className="w-full aspect-[4/5] rounded-xl overflow-hidden bg-gray-50 mb-3 relative">
        {item.destacado && (
          <span className="absolute top-2 left-2 z-10 bg-[#ba6c28] text-white text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md shadow-sm">
            Destacado
          </span>
        )}
        {item.image ? (
          <img 
            src={item.image} 
            alt={item.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-200">
            <Utensils size={32} />
          </div>
        )}
      </div>
      <h3 className="font-bold text-sm text-[#1A1A1A] line-clamp-1 leading-snug group-hover:text-[#ba6c28] transition-colors uppercase tracking-tight">
        {item.name}
      </h3>
      <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 font-light leading-relaxed">
        {item.descripcion_corta}
      </p>
    </div>
    <div className="mt-4 pt-2 border-t border-gray-50 flex justify-between items-center">
      <span className="text-sm font-bold text-[#4a5d4e]">
        ${item.price.toLocaleString('es-CO')}
      </span>
      <div className="w-6 h-6 rounded-full bg-[#FAF9F6] flex items-center justify-center text-gray-300 group-hover:text-[#ba6c28] transition-all">
        <ChevronRight size={14} />
      </div>
    </div>
  </motion.div>
);

const BottomNav = ({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) => (
  <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 px-8 py-4 flex justify-between items-center z-[90] max-w-md mx-auto rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
    <button 
      onClick={() => onTabChange('inicio')}
      className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'inicio' ? 'text-[#4a5d4e]' : 'text-gray-400'}`}
    >
      <Home size={20} />
      <span className="text-[10px] font-bold tracking-wider uppercase">Inicio</span>
    </button>
    <button 
      onClick={() => onTabChange('menu')}
      className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'menu' ? 'text-[#4a5d4e]' : 'text-gray-400'}`}
    >
      <MenuIcon size={20} />
      <span className="text-[10px] font-bold tracking-wider uppercase">Menú</span>
    </button>
    <button 
      onClick={() => onTabChange('market')}
      className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'market' ? 'text-[#4a5d4e]' : 'text-gray-400'}`}
    >
      <ShoppingBag size={20} />
      <span className="text-[10px] font-bold tracking-wider uppercase">Market</span>
    </button>
  </div>
);

const MenuDrawer = ({ 
  isOpen, 
  onClose, 
  sections, 
  activeSection, 
  onSelectSection,
  onOpenSettings,
  configData
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  sections: string[]; 
  activeSection: string; 
  onSelectSection: (section: string) => void; 
  onOpenSettings?: () => void;
  configData: RestaurantConfig;
}) => {
  const listSections = sections.length > 0 ? sections : [
    'Desayunos',
    'Almuerzos',
    'Cenas',
    'Pastelería Salada',
    'Repostería',
    'Coffee Bar',
    'Bebidas',
    'Mercado Saludable',
    'Healthy Hunters'
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[150] bg-[#1a1a1a]/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-[85%] max-w-[340px] bg-[#FAF9F6] z-[160] shadow-2xl p-8 flex flex-col justify-between border-r border-[#ba6c28]/10"
          >
            <div>
              <div className="flex justify-between items-center mb-12">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#ba6c28] font-bold">Experiencia</span>
                  <span className="font-editorial text-lg font-bold text-[#1A1A1A] tracking-wide">Healthy Hunters</span>
                </div>
                <button 
                  onClick={onClose} 
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-500 hover:text-[#ba6c28] border border-gray-100 shadow-sm transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <nav className="space-y-5">
                {listSections.map((sect) => {
                  const isActive = sect.toLowerCase().trim() === activeSection.toLowerCase().trim();
                  return (
                    <button
                      key={sect}
                      onClick={() => {
                        onSelectSection(sect);
                        onClose();
                      }}
                      className="group flex items-center gap-3 w-full text-left"
                    >
                      <span className={`h-[1px] bg-[#ba6c28] transition-all duration-300 ${isActive ? 'w-6' : 'w-0 group-hover:w-4'}`} />
                      <span 
                        className={`font-editorial text-2xl tracking-wide transition-all duration-300 ${
                          isActive 
                            ? 'text-[#ba6c28] font-semibold translate-x-2' 
                            : 'text-gray-800 hover:text-[#ba6c28] hover:translate-x-1'
                        }`}
                      >
                        {sect}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="border-t border-gray-200/60 pt-6 space-y-4">
              <div className="space-y-1">
                <span className="text-[8px] uppercase tracking-[0.2em] text-[#ba6c28] font-bold block">Horario de Cocina</span>
                <p className="text-[10px] text-gray-500 font-medium font-sans">{configData.horario || 'Lunes a Domingo: 8:00 AM - 8:00 PM'}</p>
              </div>
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <span className="text-[8px] uppercase tracking-[0.2em] text-[#ba6c28] font-bold block">Red de la Casa</span>
                  <p className="text-[10px] text-gray-400 font-sans font-light leading-snug flex flex-col">
                    <span>Nombre de wifi: <strong className="text-gray-600 font-semibold font-mono">{configData.wifiRed || 'Healthy Hunters'}</strong></span>
                    <span>clave: <strong className="text-[#4a5d4e] font-semibold font-mono">{configData.wifiClave || '9753Healthy$'}</strong></span>
                  </p>
                </div>
                {onOpenSettings && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSettings();
                    }}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-[#ba6c28]/10 text-gray-400 hover:text-[#ba6c28] transition-all"
                    title="Configuración de origen de datos"
                  >
                    <Settings size={14} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const ProductDetail = ({ item, allItems, onBack, onSelectProduct }: { item: MenuItem; allItems: MenuItem[]; onBack: () => void; onSelectProduct: (product: MenuItem) => void }) => {
  const [copied, setCopied] = useState(false);

  const relatedItems = useMemo(() => {
    return allItems
      .filter(i => i.category === item.category && i.id !== item.id && i.seccion.toLowerCase().trim() !== 'banner')
      .slice(0, 4);
  }, [item, allItems]);

  const handleShare = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?plate=${encodeURIComponent(item.name || item.id)}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          fallbackCopy(shareUrl);
        });
    } else {
      fallbackCopy(shareUrl);
    }
  };

  const fallbackCopy = (text: string) => {
    const input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Sharing failed', err);
    }
    document.body.removeChild(input);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed inset-0 z-[100] bg-[#FAF9F6] overflow-y-auto no-scrollbar"
    >
      <div className="relative min-h-screen max-w-md mx-auto bg-white shadow-2xl">
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 z-[110] bg-white/80 backdrop-blur-md p-3 rounded-full border border-gray-100 shadow-md hover:bg-white transition-all active:scale-95"
        >
          <ChevronRight className="rotate-180" size={20} />
        </button>

        <div className="w-full aspect-square relative">
          <img 
            src={item.image} 
            alt={item.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#FAF9F6] to-transparent" />
        </div>

        <div className="px-8 pb-32 -mt-10 relative z-10 space-y-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="bg-[#ba6c28]/10 text-[#ba6c28] px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em]">
                {item.seccion}
              </span>
              <span className="text-gray-400 text-[10px] uppercase tracking-[0.2em]">
                • {item.category}
              </span>
            </div>
            <h1 className="font-editorial text-4xl font-medium text-[#1A1A1A] leading-tight">
              {item.name}
            </h1>
            <p className="font-bold text-2xl text-[#4a5d4e]">
              ${item.price.toLocaleString('es-CO')}
            </p>
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#ba6c28]">Experiencia</h3>
              <p className="text-gray-600 leading-relaxed font-light text-sm">
                {item.descripcion || item.descripcion_larga || item.descripcion_corta}
              </p>
            </div>

            {item.ingredientes && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">Ingredientes</h3>
                <p className="text-gray-500 leading-relaxed font-light italic text-sm">
                  {item.ingredientes}
                </p>
              </div>
            )}

            {item.beneficios && (
              <div className="flex flex-wrap gap-2 pt-2">
                {item.beneficios.split(',').map(b => (
                  <span key={b} className="bg-gray-50 text-gray-500 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-gray-100">
                    {b.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>

          {relatedItems.length > 0 && (
            <div className="pt-10 border-t border-gray-100">
              <h3 className="font-editorial text-xl font-semibold text-[#1A1A1A] mb-6 tracking-tight">Especialidades Relacionadas</h3>
              <div className="grid grid-cols-2 gap-4">
                {relatedItems.map(rel => (
                  <div 
                    key={rel.id} 
                    onClick={() => onSelectProduct(rel)}
                    className="space-y-3 cursor-pointer group"
                  >
                    <div className="aspect-square rounded-xl overflow-hidden bg-gray-50">
                      <img src={rel.image} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" alt={rel.name} />
                    </div>
                    <h4 className="text-[11px] font-bold uppercase tracking-tight line-clamp-1">{rel.name}</h4>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="fixed bottom-8 left-8 right-8 z-[120] max-w-xs mx-auto">
            <button 
              onClick={handleShare}
              className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-[0.2em] text-xs transition-all duration-300 shadow-2xl active:scale-95 cursor-pointer ${
                copied 
                  ? 'bg-emerald-600 text-white shadow-emerald-950/20' 
                  : 'bg-[#ba6c28] text-white hover:bg-[#a05a1e] shadow-orange-950/20'
              }`}
            >
              {copied ? (
                <>
                  <Check size={16} /> ¡Enlace Copiado!
                </>
              ) : (
                <>
                  <Share2 size={16} /> Compartir este plato
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const DEFAULT_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQax16GTId6gHF80_An0OYIuZhYWLKxBtQgQO1k4w7KaQRuZgE2yBRTLaX8G9DsHm-QxWgft-JSPwuH/pub?output=csv';
const DEFAULT_CONFIG_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQax16GTId6gHF80_An0OYIuZhYWLKxBtQgQO1k4w7KaQRuZgE2yBRTLaX8G9DsHm-QxWgft-JSPwuH/pub?gid=1542140322&single=true&output=csv';

// --- Main App ---

export default function App() {
  const [activeSection, setActiveSection] = useState<string>('Desayunos');
  const [activeBusinessLine, setActiveBusinessLine] = useState<'restaurante' | 'cafe_bebidas' | 'tienda_saludable'>('restaurante');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  
  // Restaurant Info Config State
  const [configData, setConfigData] = useState<RestaurantConfig>({
    direccion: 'Carrera 53 # 79-222, Barranquilla, Colombia',
    horario: 'Lunes a Domingo: 8:00 AM - 8:00 PM',
    instagram: '',
    facebook: '',
    telefono: '',
    wifiRed: 'Healthy Hunters',
    wifiClave: '9753Healthy$',
    bannerUrl: '',
    logoUrl: ''
  });

  // Sheets Integration State
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);
  const [spreadsheetId, setSpreadsheetId] = useState<string>(localStorage.getItem('menu_sheet_id') || DEFAULT_CSV_URL);
  const [configUrl, setConfigUrl] = useState<string>(
    localStorage.getItem('menu_config_url') && localStorage.getItem('menu_config_url') !== 'https://google.com'
      ? localStorage.getItem('menu_config_url')!
      : DEFAULT_CONFIG_URL
  );
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);

  const loadAllData = async (sheetId: string, confUrl: string) => {
    setIsLoadingSheet(true);
    setSheetError(null);
    try {
      await Promise.all([
        loadSheetData(sheetId),
        loadConfigData(confUrl)
      ]);
    } catch (err: any) {
      setSheetError(err.message || 'Error al cargar los datos');
    } finally {
      setIsLoadingSheet(false);
    }
  };

  useEffect(() => {
    const initialSource = spreadsheetId || DEFAULT_CSV_URL;
    const initialConfig = configUrl;
    const unsubscribe = initAuth(
      (user) => {
        setUser(user);
        loadAllData(initialSource, initialConfig);
      },
      () => {
        setUser(null);
        loadAllData(initialSource, initialConfig);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        loadAllData(spreadsheetId, configUrl);
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loadConfigData = async (url: string) => {
    if (!url || !url.startsWith('http')) {
      return;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) return;
      const text = await response.text();

      const rows = parseCSV(text);
      if (!rows || rows.length < 1) return;
      
      const newConfig = { ...configData };

      rows.forEach((row) => {
        if (row.length < 2) return;
        const colA = (row[0] || '').trim();
        const colB = (row[1] || '').trim();

        if (colA === 'instagram') {
          newConfig.instagram = colB;
        } else if (colA === 'facebook') {
          newConfig.facebook = colB;
        } else if (colA === 'telefono') {
          if (/^\+?\d+$/.test(colB.replace(/\s+/g, ''))) {
            const stripped = colB.replace(/[^\d]/g, '');
            newConfig.telefono = `https://wa.me/${stripped}`;
          } else {
            newConfig.telefono = colB;
          }
        } else if (colA === 'Logo_url') {
          newConfig.logoUrl = colB;
        } else if (colA === 'banner_home') {
          let bannerUrlOptimized = colB;
          if (bannerUrlOptimized && bannerUrlOptimized.includes('cloudinary.com') && bannerUrlOptimized.includes('/upload/')) {
            const uploadIdx = bannerUrlOptimized.indexOf('/upload/');
            bannerUrlOptimized = bannerUrlOptimized.substring(0, uploadIdx + 8) + 'q_auto,f_auto/' + bannerUrlOptimized.substring(uploadIdx + 8);
          }
          newConfig.bannerUrl = bannerUrlOptimized;
        } else if (colA.toLowerCase().includes('direccion') || colA.toLowerCase().includes('address') || colA.toLowerCase().includes('ubicacion')) {
          newConfig.direccion = colB;
        } else if (colA.toLowerCase().includes('horario') || colA.toLowerCase().includes('schedule') || colA.toLowerCase().includes('horas')) {
          newConfig.horario = colB;
        } else if (colA.toLowerCase().includes('red') || colA.toLowerCase().includes('ssid') || colA.toLowerCase().includes('wifi_red')) {
          newConfig.wifiRed = colB;
        } else if (colA.toLowerCase().includes('clave') || colA.toLowerCase().includes('password') || colA.toLowerCase().includes('wifi_clave') || colA.toLowerCase().includes('wifi_pass')) {
          newConfig.wifiClave = colB;
        }
      });
      setConfigData(newConfig);
      localStorage.setItem('menu_config_url', url);
    } catch (e) {
      console.error('Failed to load config, using defaults:', e);
    }
  };

  const loadSheetData = async (idOrUrl: string) => {
    if (!idOrUrl) return;
    try {
      const isUrl = idOrUrl.startsWith('http');
      let data: SheetProduct[] = [];
      if (isUrl) {
        data = await fetchCSVData(idOrUrl);
      } else {
        data = await fetchSpreadsheetData(idOrUrl, 'Sheet1!A:K');
      }

      const transformed: MenuItem[] = data.map((d, i) => {
        // Enforce the requirement: Vertical crop vertical of Cloudinary (w_600,h_750,c_fill,g_auto,q_auto,f_auto)
        const croppedImage = formatCloudinaryUrl(d.imagen, true);
        return {
          id: `s-${i}`,
          seccion: (d.seccion || '').trim(),
          category: (d.categoria || '').trim(),
          name: (d.nombre || '').trim(),
          descripcion: (d.descripcion || '').trim(),
          descripcion_corta: (d.descripcion_corta || '').trim(),
          descripcion_larga: (d.descripcion_larga || '').trim(),
          price: d.precio,
          image: croppedImage,
          ingredientes: (d.ingredientes || '').trim(),
          beneficios: (d.beneficios || '').trim(),
          destacado: d.destacado
        };
      });
      setMenuItems(transformed);
      localStorage.setItem('menu_sheet_id', idOrUrl);
    } catch (err: any) {
      throw new Error(err.message || 'Error al cargar los platos');
    }
  };

  const headerImageUrl = useMemo(() => {
    if (configData.bannerUrl) {
      return configData.bannerUrl;
    }
    const bannerItem = menuItems.find(item => 
      item.seccion.toLowerCase().trim() === 'banner' || 
      item.category.toLowerCase().trim() === 'banner' ||
      item.name.toLowerCase().trim() === 'banner' ||
      item.id.toLowerCase().trim() === 'banner'
    );
    if (bannerItem?.image) {
      return formatCloudinaryUrl(bannerItem.image, false);
    }
    return '';
  }, [menuItems, configData.bannerUrl]);

  useEffect(() => {
    if (menuItems && menuItems.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const plateQuery = params.get('plate');
      if (plateQuery) {
        const decoded = decodeURIComponent(plateQuery).trim().toLowerCase();
        const found = menuItems.find(item => 
          item.id.toLowerCase() === decoded || 
          item.name.toLowerCase().trim() === decoded
        );
        if (found) {
          setSelectedProduct(found);
        }
      }
    }
  }, [menuItems]);

  const sections = useMemo(() => {
    const validItems = menuItems.filter(item => 
      item.seccion.toLowerCase().trim() !== 'banner' &&
      item.category.toLowerCase().trim() !== 'banner' &&
      item.name.toLowerCase().trim() !== 'banner' &&
      item.seccion.toLowerCase().trim() !== 'general' &&
      item.seccion.toLowerCase().trim() !== 'genera' &&
      item.seccion.toLowerCase().trim() !== ''
    );
    const uniq: string[] = Array.from(new Set(validItems.map(item => item.seccion)));
    const order = [
      'Desayunos',
      'Almuerzos',
      'Cenas',
      'Pastelería Salada',
      'Repostería',
      'Coffee Bar',
      'Bebidas',
      'Mercado Saludable',
      'Healthy Hunters'
    ];
    return uniq.sort((a, b) => {
      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [menuItems]);

  const getSectionLine = (sectionName: string): 'restaurante' | 'cafe_bebidas' | 'tienda_saludable' => {
    const lower = sectionName.toLowerCase().trim();
    if (
      lower.includes('coffee') || 
      lower.includes('bebida') || 
      lower.includes('reposter') || 
      lower.includes('tomar') ||
      lower.includes('café') ||
      lower.includes('cafe') ||
      lower.includes('pastelería dulce')
    ) {
      return 'cafe_bebidas';
    } else if (
      lower.includes('mercado') || 
      lower.includes('hunters') || 
      lower.includes('tienda') || 
      lower.includes('market') ||
      lower.includes('suplemento')
    ) {
      return 'tienda_saludable';
    } else {
      return 'restaurante';
    }
  };

  const filteredSectionsForLine = useMemo(() => {
    return sections.filter(sec => getSectionLine(sec) === activeBusinessLine);
  }, [sections, activeBusinessLine]);

  useEffect(() => {
    if (sections.length > 0 && !sections.includes(activeSection)) {
      setActiveSection(sections[0]);
    }
  }, [sections]);

  useEffect(() => {
    if (filteredSectionsForLine.length > 0 && !filteredSectionsForLine.includes(activeSection)) {
      setActiveSection(filteredSectionsForLine[0]);
      setActiveCategory('all');
    }
  }, [filteredSectionsForLine]);

  useEffect(() => {
    if (activeSection) {
      const line = getSectionLine(activeSection);
      if (line !== activeBusinessLine) {
        setActiveBusinessLine(line);
      }
    }
  }, [activeSection]);

  const dynamicCategories = useMemo(() => {
    const sectionItems = menuItems.filter(item => 
      item.seccion.toLowerCase().trim() === activeSection.toLowerCase().trim() &&
      item.seccion.toLowerCase().trim() !== 'banner' &&
      item.category.toLowerCase().trim() !== 'banner' &&
      item.name.toLowerCase().trim() !== 'banner'
    );
    const uniqueCats = Array.from(new Set(sectionItems.map(item => item.category)))
      .filter((cat: any) => {
        if (!cat) return false;
        const lower = String(cat).toLowerCase().trim();
        return lower !== 'genera' && lower !== 'general' && lower !== '';
      });
    return ['all', ...uniqueCats];
  }, [menuItems, activeSection]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const menuDishes = menuItems.filter(item => 
      item.seccion.toLowerCase().trim() !== 'banner' &&
      item.category.toLowerCase().trim() !== 'banner' &&
      item.name.toLowerCase().trim() !== 'banner' &&
      item.seccion.toLowerCase().trim() !== 'general' &&
      item.seccion.toLowerCase().trim() !== 'genera' &&
      item.seccion.toLowerCase().trim() !== ''
    );

    return menuDishes.filter(item => {
      const matchesSearch = !query || 
                           item.name.toLowerCase().includes(query) || 
                           item.descripcion.toLowerCase().includes(query) ||
                           item.descripcion_corta.toLowerCase().includes(query) ||
                           item.category.toLowerCase().includes(query) ||
                           item.seccion.toLowerCase().includes(query);
      if (query) {
        return matchesSearch;
      }
      const matchesSection = item.seccion.toLowerCase().trim() === activeSection.toLowerCase().trim();
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      return matchesSection && matchesCategory;
    });
  }, [activeSection, activeCategory, searchQuery, menuItems]);

  const featuredItems = useMemo(() => {
    if (searchQuery.trim()) return [];
    return menuItems.filter(item => 
      item.destacado && 
      item.seccion.toLowerCase().trim() === activeSection.toLowerCase().trim() &&
      item.seccion.toLowerCase().trim() !== 'banner' &&
      item.category.toLowerCase().trim() !== 'banner' &&
      item.name.toLowerCase().trim() !== 'banner' &&
      item.seccion.toLowerCase().trim() !== 'general' &&
      item.seccion.toLowerCase().trim() !== 'genera' &&
      item.seccion.toLowerCase().trim() !== ''
    );
  }, [menuItems, activeSection, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] pb-24">
      <AnimatePresence>
        {selectedProduct && (
          <ProductDetail 
            item={selectedProduct} 
            allItems={menuItems}
            onBack={() => setSelectedProduct(null)} 
            onSelectProduct={(p) => setSelectedProduct(p)}
          />
        )}
      </AnimatePresence>

      <MenuDrawer 
        isOpen={showMenuDrawer}
        onClose={() => setShowMenuDrawer(false)}
        sections={sections}
        activeSection={activeSection}
        onSelectSection={(sect) => {
          setActiveSection(sect);
          setActiveCategory('all');
          setSearchQuery('');
          setSelectedProduct(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenSettings={() => setShowConfig(true)}
        configData={configData}
      />

      {/* SECCIÓN SUPERIOR: HERO EDITORIAL */}
      <header 
        className="relative text-white pt-16 pb-36 px-6 overflow-hidden bg-[#4a5d4e] min-h-[350px] flex flex-col justify-between"
        style={{
          backgroundImage: headerImageUrl ? `url(${headerImageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Decoración sutil de fondo */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
        
        {/* Header superior con buscador minimalista */}
        <div className="max-w-md mx-auto flex justify-between items-center mb-12 relative z-10 w-full">
            <button 
              onClick={() => setShowMenuDrawer(true)}
              className="w-10 h-10 flex flex-col justify-center gap-1.5 opacity-80 cursor-pointer"
            >
                <span className="block w-6 h-0.5 bg-white bg-opacity-90"></span>
                <span className="block w-4 h-0.5 bg-white bg-opacity-90"></span>
            </button>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 flex-1 mx-4 max-w-xs transition-all focus-within:bg-white/20">
                <Search className="w-4 h-4 text-white/60" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar en el menú..." 
                  className="bg-transparent text-xs text-white placeholder-white/50 outline-none w-full font-light"
                />
            </div>
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center cursor-pointer font-bold text-xs ring-4 ring-white/10 overflow-hidden shrink-0">
                {configData.logoUrl ? (
                  <img 
                    src={configData.logoUrl} 
                    alt="Logo" 
                    className="w-full h-full object-contain p-1.5" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-1.5 text-[#4A5D4E]">
                    <line x1="38" y1="72" x2="62" y2="48" />
                    <polygon points="62,48 68,42 74,48 68,54" fill="currentColor" stroke="none" />
                    <path d="M 48 50 L 38 40 L 38 28 L 50 28 L 60 38" />
                    <path d="M 52 50 L 62 60 L 62 72 L 50 72 L 40 62" />
                  </svg>
                )}
            </div>
        </div>

        {/* Títulos Gourmet / Revista */}
        <div className="max-w-md mx-auto text-center mb-6 relative z-10 w-full">
            <h1 className="font-editorial text-4xl md:text-5xl font-medium tracking-wide leading-tight">
                Healthy Hunters
            </h1>
        </div>

        {/* Indicadores del Carrusel */}
        <div className="max-w-md mx-auto flex justify-center gap-1.5 mt-8 relative z-10 w-full">
            <span className="w-8 h-1 bg-[#ba6c28] rounded-full transition-all duration-300"></span>
            <span className="w-2 h-1 bg-white/30 rounded-full"></span>
            <span className="w-2 h-1 bg-white/30 rounded-full"></span>
            <span className="w-2 h-1 bg-white/30 rounded-full"></span>
        </div>
      </header>

      {/* SECCIÓN CONTENEDORA FLOTANTE */}
      <main className="relative -mt-16 bg-[#FAF9F6] rounded-t-premium min-h-screen shadow-2xl border-t border-white/20 px-6 pt-8 max-w-md mx-auto w-full">
        
        {/* LÍNEAS DE NEGOCIO (SELECTOR DE UNIVERSOS) */}
        <section className="mb-6">
          <div className="bg-white/80 backdrop-blur-md p-1 rounded-2xl flex border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden">
            {[
              { id: 'restaurante', name: 'Restaurante', icon: Utensils },
              { id: 'cafe_bebidas', name: 'Café & Bebidas', icon: Coffee },
              { id: 'tienda_saludable', name: 'Tienda', icon: ShoppingBag }
            ].map(line => {
              const Icon = line.icon;
              const isActive = activeBusinessLine === line.id;
              return (
                <button
                  key={line.id}
                  onClick={() => {
                    setActiveBusinessLine(line.id as any);
                    setSearchQuery('');
                    setSelectedProduct(null);
                  }}
                  className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl text-center relative z-10 transition-all cursor-pointer ${
                    isActive ? 'text-white font-bold' : 'text-gray-400 hover:text-gray-600'
                  }`}
                  style={{ touchAction: 'manipulation' }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeBusinessLineBG"
                      className="absolute inset-0 bg-[#4a5d4e] rounded-xl z-[-1]"
                      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    />
                  )}
                  <Icon size={15} className={`${isActive ? 'text-white' : 'text-gray-400'} mb-1 transition-colors`} />
                  <span className="text-[9px] font-bold uppercase tracking-wider leading-none">
                    {line.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* SUBMENÚ DE UNIVERSOS */}
        <section className="mb-8">
            <div className="flex justify-between items-baseline mb-6">
                <h2 className="font-editorial text-2xl font-semibold tracking-tight text-[#1A1A1A]">Nuestra Carta</h2>
            </div>
            
            {/* Carrusel Horizontal de Secciones */}
            <div className="flex gap-6 overflow-x-auto no-scrollbar py-2 border-b border-gray-200/60 pb-4">
              {filteredSectionsForLine.length > 0 ? (
                filteredSectionsForLine.map(section => (
                  <CategoryPill
                    key={section}
                    id={section}
                    name={section}
                    icon={null}
                    active={activeSection === section}
                    onClick={() => {
                      setActiveSection(section);
                      setActiveCategory('all');
                      setSearchQuery('');
                      setSelectedProduct(null);
                    }}
                  />
                ))
              ) : (
                ['Desayunos', 'Almuerzos', 'Cenas'].map(s => (
                  <span key={s} className="text-gray-200 text-xs uppercase tracking-widest font-semibold pb-2 border-b-2 border-transparent">
                    {s}
                  </span>
                ))
              )}
            </div>
        </section>

        {/* SUB-CATEGORÍAS (Acceso rápido) */}
        {dynamicCategories.length > 1 && (
          <section className="mb-8 overflow-x-auto no-scrollbar flex gap-2">
            {dynamicCategories.map(cat => (
              <SectionItem
                key={cat}
                name={cat === 'all' ? 'Ver Todo' : cat}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
              />
            ))}
          </section>
        )}

        {/* SECCIÓN DE RECOMENDADOS "SELECCIÓN DE LA CASA" */}
        {featuredItems.length > 0 && searchQuery === '' && (
          <section className="mb-8">
            <div className="flex justify-between items-baseline mb-4">
              <h3 className="font-editorial text-lg font-bold tracking-tight text-[#1A1A1A] flex items-center gap-1.5 animate-pulse">
                <span className="text-[#ba6c28]">🌟</span> Selección de la Casa
              </h3>
              <span className="text-[9px] uppercase tracking-widest text-[#ba6c28] font-bold">Favoritos</span>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-1">
              {featuredItems.map(item => (
                <motion.div
                  key={`featured-${item.id}`}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedProduct(item)}
                  className="flex-shrink-0 w-44 bg-white rounded-2xl overflow-hidden border border-gray-100 p-2.5 shadow-sm flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    <div className="w-full h-24 bg-gray-50 rounded-xl overflow-hidden mb-2 relative">
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-200">
                          <Utensils size={24} />
                        </div>
                      )}
                      <div className="absolute top-1.5 left-1.5 z-10 bg-[#FAF9F6]/90 backdrop-blur-md text-[#ba6c28] text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                        Best Seller
                      </div>
                    </div>
                    <h4 className="font-bold text-xs text-[#1A1A1A] line-clamp-1 group-hover:text-[#ba6c28] transition-colors uppercase tracking-tight leading-none mb-1">
                      {item.name}
                    </h4>
                    <p className="text-[10px] text-gray-400 line-clamp-1 font-light leading-none">
                      {item.descripcion_corta}
                    </p>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-1.5 border-t border-gray-50">
                    <span className="text-[11px] font-bold text-[#4a5d4e]">
                      ${item.price.toLocaleString('es-CO')}
                    </span>
                    <span className="text-[9px] text-[#ba6c28] font-semibold uppercase tracking-wider">Ver</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* GRID DE PRODUCTOS */}
        <section className="pb-32">
          {isLoadingSheet ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <RefreshCw className="animate-spin text-[#ba6c28]" size={32} />
              <p className="font-editorial text-lg italic text-gray-400">Curando tu selección...</p>
            </div>
          ) : (
            <>
              {featuredItems.length > 0 && searchQuery === '' && (
                <div className="flex justify-between items-baseline mb-4">
                  <h3 className="font-editorial text-lg font-bold tracking-tight text-[#1A1A1A]">
                    Toda la Variedad
                  </h3>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {filteredItems.map(item => (
                  <MenuItemCard 
                    key={item.id} 
                    item={item} 
                    onClick={() => setSelectedProduct(item)}
                  />
                ))}
              </div>

              {filteredItems.length === 0 && (
                <div className="text-center py-20 opacity-40">
                  <Utensils className="mx-auto mb-4" size={40} strokeWidth={1} />
                  <p className="font-editorial italic">Lo sentimos, la cocina aún está preparando esta sección.</p>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <BottomNav 
        activeTab={
          activeSection === 'Desayunos' ? 'inicio' : 
          activeSection === 'Mercado Saludable' ? 'market' : 'menu'
        } 
        onTabChange={(tab) => {
          if (tab === 'market') setActiveSection('Mercado Saludable');
          else if (tab === 'inicio') setActiveSection('Desayunos');
          else if (tab === 'menu') setActiveSection('Almuerzos');
          setActiveCategory('all');
          setSearchQuery('');
          setSelectedProduct(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Config Overlay */}
      <AnimatePresence>
        {showConfig && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#2D362E]/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="heading-serif text-2xl font-bold text-[#2D362E]">Configuración</h3>
                <button onClick={() => setShowConfig(false)} className="p-2 hover:bg-[#F4F1EB] rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4 text-[#1A1A1A]">
                <div>
                  <label className="block text-xs font-bold text-[#4A5D4E] uppercase tracking-widest mb-2">1. Lista de Platos (Hoja Principal)</label>
                  <input 
                    type="text" 
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    placeholder="Enlace CSV o ID de Google Sheet..."
                    className="w-full border border-gray-100 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#ba6c28]/20 bg-[#FAF9F6] text-gray-800 font-sans"
                  />
                  <p className="mt-1 text-[10px] text-gray-500 leading-normal">
                    Pega el enlace CSV publicado de la lista de platos.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A5D4E] uppercase tracking-widest mb-2">2. Panel de Información (Configuración)</label>
                  <input 
                    type="text" 
                    value={configUrl}
                    onChange={(e) => setConfigUrl(e.target.value)}
                    placeholder="Enlace CSV de configuración"
                    className="w-full border border-gray-100 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#ba6c28]/20 bg-[#FAF9F6] text-gray-800 font-sans"
                  />
                  <p className="mt-1 text-[10px] text-gray-500 leading-normal">
                    Pega el enlace CSV publicado de la pestaña de configuración.
                  </p>
                </div>
                
                <div className="pt-1">
                  <button
                    onClick={() => {
                      setSpreadsheetId(DEFAULT_CSV_URL);
                      setConfigUrl(DEFAULT_CONFIG_URL);
                      loadAllData(DEFAULT_CSV_URL, DEFAULT_CONFIG_URL);
                      setShowConfig(false);
                    }}
                    className="text-[10px] underline hover:text-[#ba6c28] text-gray-400 font-bold uppercase tracking-wider block"
                  >
                    Restaurar enlace original Healthy Hunters
                  </button>
                </div>
                
                <button 
                  onClick={() => {
                    loadAllData(spreadsheetId, configUrl);
                    setShowConfig(false);
                  }}
                  disabled={isLoadingSheet}
                  className="w-full bg-[#BC6C25] text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
                >
                  {isLoadingSheet ? <RefreshCw className="animate-spin" size={18} /> : 'Actualizar Todo'}
                </button>
                
                <button 
                  onClick={async () => {
                    await logout();
                    setShowConfig(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 text-red-500 font-bold text-xs uppercase tracking-widest pt-1 hover:opacity-70 transition-opacity"
                >
                  <LogOut size={14} /> Cerrar Sesión
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-[#4A5D4E] text-[#FDFBF7] py-20 px-4 mt-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16">
          {/* Info */}
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-full text-[#4A5D4E] flex items-center justify-center overflow-hidden w-10 h-10 shrink-0">
                {configData.logoUrl ? (
                  <img 
                    src={configData.logoUrl} 
                    alt="Healthy Hunters Logo" 
                    className="w-full h-full object-contain p-1.5" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-1.5 text-[#4A5D4E]">
                    <line x1="38" y1="72" x2="62" y2="48" />
                    <polygon points="62,48 68,42 74,48 68,54" fill="currentColor" stroke="none" />
                    <path d="M 48 50 L 38 40 L 38 28 L 50 28 L 60 38" />
                    <path d="M 52 50 L 62 60 L 62 72 L 50 72 L 40 62" />
                  </svg>
                )}
              </div>
              <span className="heading-serif text-3xl font-bold tracking-tight uppercase">Healthy Hunters</span>
            </div>
            <p className="text-[#FDFBF7]/80 text-sm leading-relaxed max-w-xs font-light">
              Ubicados en el corazón de la ciudad, ofreciendo una alternativa balanceada y deliciosa para cada momento del día.
            </p>
            <div className="flex gap-6">
              {configData.instagram && (
                <a href={configData.instagram} target="_blank" rel="noreferrer" className="text-white hover:text-[#BC6C25] transition-colors">
                  <Instagram size={20} />
                </a>
              )}
              {configData.facebook && (
                <a href={configData.facebook} target="_blank" rel="noreferrer" className="text-white hover:text-[#BC6C25] transition-colors">
                  <Facebook size={20} />
                </a>
              )}
              {configData.telefono && (
                <a href={configData.telefono} target="_blank" rel="noreferrer" className="text-white hover:text-[#BC6C25] transition-colors">
                  <Phone size={20} />
                </a>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-6">
            <h4 className="heading-serif text-xl font-bold mb-8 border-b border-white/10 pb-2">Visítanos</h4>
            <div className="flex items-start gap-3 text-[#FDFBF7]/90">
              <MapPin className="text-[#BC6C25] shrink-0" size={20} />
              <span className="text-sm leading-relaxed">{configData.direccion}</span>
            </div>
            <div className="flex items-center gap-3 text-[#FDFBF7]/90">
              <Clock className="text-[#BC6C25] shrink-0" size={20} />
              <span className="text-sm">{configData.horario}</span>
            </div>
          </div>

          {/* Newsletter */}
          <div className="space-y-6">
            <h4 className="heading-serif text-xl font-bold mb-8 border-b border-white/10 pb-2">Únete a la Caza</h4>
            <p className="text-[#FDFBF7]/80 text-sm font-light">Suscríbete para recibir recetas y promociones saludables.</p>
            <div className="flex flex-col gap-3">
              <input 
                type="email" 
                placeholder="tu@email.com" 
                className="bg-white/10 border border-white/20 rounded-full px-6 py-3 text-sm focus:outline-none focus:border-[#BC6C25] transition-colors flex-grow placeholder:text-white/40"
              />
              <button className="bg-[#BC6C25] hover:bg-[#a65d1f] text-white rounded-full px-8 py-3 text-sm font-bold transition-all shadow-lg active:scale-95">
                Suscribirme
              </button>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto pt-16 mt-16 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-[#FDFBF7]/40 font-bold">
          <span>&copy; 2026 Healthy Hunters &bull; Organic Ingredients Prioritized</span>
          <div className="flex gap-8">
            <span>Calories calculated per serving</span>
            <span>Hecho con amor y vegetales</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
