import { useState, useMemo, useEffect } from 'react';
import { campData } from './data/campData';
import { useAuth } from './hooks/useAuth';
import { useSync } from './hooks/useSync';
import { useTickets } from './hooks/useTickets';
import LoginModal from './components/LoginModal';
import TicketForm from './components/TicketForm';
import TicketList from './components/TicketList';
import AdminPanel from './components/AdminPanel';
import StaffManager from './components/StaffManager';
import StatusIndicator from './components/StatusIndicator';

// ─── i18n ────────────────────────────────────────────────────────────────────
type Lang = 'en' | 'hi';

interface I18nDict {
  title: string;
  searchPlaceholder: string;
  statTotal: string;
  statFiltered: string;
  statView: string;
  mapTitle: string;
  galleryTitle: string;
  roomLabel: string;
  noResults: string;
  btnLang: string;
  categories: Record<string, string>;
}

const i18n: Record<Lang, I18nDict> = {
  en: {
    title: 'Camp Map & Directory',
    searchPlaceholder: 'Search for a department... (e.g., Eye, Dental)',
    statTotal: 'Total Depts',
    statFiltered: 'Filtered',
    statView: 'Active View',
    mapTitle: 'Camp Layout (Live Pin Map)',
    galleryTitle: 'Venue Guide Photos',
    roomLabel: 'Room:',
    noResults: 'No departments found. Try a different search.',
    btnLang: 'हिंदी',
    categories: {
      All: 'All', Cancer: 'Cancer', Pathology: 'Pathology', 'TB Chest': 'TB Chest',
      Eye: 'Eye', Dental: 'Dental', Pediatrics: 'Child', Orthopedics: 'Bone',
      Cardiology: 'Heart', Gynecology: 'Women', ENT: 'ENT', Dermatology: 'Skin',
    },
  },
  hi: {
    title: 'शिविर निर्देशिका',
    searchPlaceholder: 'विभाग खोजें... (जैसे, नेत्र, दंत)',
    statTotal: 'कुल विभाग',
    statFiltered: 'खोज परिणाम',
    statView: 'सक्रिय श्रेणी',
    mapTitle: 'कैंप लेआउट (लाइव मैप)',
    galleryTitle: 'मार्गदर्शक तस्वीरें',
    roomLabel: 'कक्ष:',
    noResults: 'कोई विभाग नहीं मिला।',
    btnLang: 'English',
    categories: {
      All: 'सभी', Cancer: 'कैंसर', Pathology: 'पैथोलॉजी', 'TB Chest': 'टीबी/छाती',
      Eye: 'नेत्र', Dental: 'दंत', Pediatrics: 'शिशु', Orthopedics: 'अस्थि',
      Cardiology: 'हृदय', Gynecology: 'महिला', ENT: 'ईएनटी', Dermatology: 'त्वचा',
    },
  },
};

const categoriesList: { id: string; icon: string }[] = [
  { id: 'All',        icon: '' },
  { id: 'Cancer',     icon: '🎗️' },
  { id: 'Pathology',  icon: '🔬' },
  { id: 'TB Chest',   icon: '🫁' },
  { id: 'Eye',        icon: '👁️' },
  { id: 'Dental',     icon: '🦷' },
  { id: 'Pediatrics', icon: '👶' },
  { id: 'Orthopedics',icon: '🦴' },
  { id: 'Cardiology', icon: '🫀' },
  { id: 'Gynecology', icon: '🤰' },
  { id: 'ENT',        icon: '👂' },
  { id: 'Dermatology',icon: '🤚' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getLocationClass(block: string): string {
  if (block.includes('Block - A')) return 'a';
  if (block.includes('Block - B')) return 'b';
  if (block.includes('Block - C')) return 'c';
  if (block.includes('Dome - 03')) return 'd3';
  return 'tent';
}

function localiseBlock(block: string, lang: Lang): string {
  if (lang === 'en') return block;
  return block.replace('Block', 'ब्लॉक').replace('Dome', 'डोम');
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang]             = useState<Lang>('en');
  const [category, setCategory]     = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [modalSrc, setModalSrc]     = useState<string | null>(null);
  const [showLogin, setShowLogin]   = useState(false);
  const [showStaff, setShowStaff]   = useState(false);

  const auth    = useAuth();
  const sync    = useSync();
  const { tickets, loading, refetch, updateTicketOptimistic } = useTickets();
  const [staffTab, setStaffTab] = useState<'report' | 'feed' | 'admin' | 'team'>('report');

  const dict = i18n[lang];

  // Derived: filtered data
  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return campData.filter(item => {
      const matchesSearch =
        item.dept.toLowerCase().includes(term) ||
        item.deptHi.toLowerCase().includes(term) ||
        item.loc.toLowerCase().includes(term) ||
        item.locHi.toLowerCase().includes(term);
      const matchesCategory = category === 'All' || item.cat === category;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, category]);

  // Derived: active map pins
  const activePins = useMemo(() => {
    const pins = new Set<string>();
    filteredData.forEach(item => {
      if (item.block.includes('Block - A')) pins.add('a');
      if (item.block.includes('Block - B')) pins.add('b');
      if (item.block.includes('Block - C')) pins.add('c');
      if (item.block.includes('Dome - 03')) pins.add('d3');
    });
    return pins;
  }, [filteredData]);

  // Close modal on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalSrc(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="app-container">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="header-row" style={{ marginBottom: 20 }}>
        <div className="header-title-group">
          <h1>{dict.title}</h1>
          <div className="header-actions">
            <StatusIndicator isSyncing={sync.isSyncing} pendingCount={sync.pendingCount} />
            {auth.isAuthenticated ? (
              <button
                className="staff-btn staff-btn-active"
                onClick={() => setShowStaff(s => !s)}
              >
                👤 {auth.staffName} {showStaff ? '▲' : '▼'}
              </button>
            ) : (
              <button
                className="staff-btn"
                onClick={() => setShowLogin(true)}
              >
                🔐 Staff
              </button>
            )}
            <button
              className="lang-btn"
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            >
              🌐 <span>{dict.btnLang}</span>
            </button>
          </div>
        </div>

        <div className="stats-panel">
          <div className="stat-item">
            <span className="stat-label">{dict.statTotal}</span>
            <span className="stat-value">{campData.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{dict.statFiltered}</span>
            <span className="stat-value">{filteredData.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{dict.statView}</span>
            <span className="stat-value">{dict.categories[category]}</span>
          </div>
        </div>
      </div>
      {/* ── Staff Portal Panel ──────────────────────────────────────── */}
      {auth.isAuthenticated && showStaff && (
        <div className="staff-panel">
          <div className="staff-panel-header">
            <span>Staff Portal</span>
            <button
              className="logout-btn"
              onClick={() => { auth.logout(); setShowStaff(false); }}
            >
              Logout
            </button>
          </div>

          {/* Tab bar */}
          <div className="staff-tabs">
            <button className={`staff-tab${staffTab === 'report' ? ' active' : ''}`} onClick={() => setStaffTab('report')}>📋 Report</button>
            <button className={`staff-tab${staffTab === 'feed'   ? ' active' : ''}`} onClick={() => setStaffTab('feed')}>
              🎫 Live Feed {sync.pendingCount > 0 && <span className="tab-badge">{sync.pendingCount}</span>}
            </button>
            {auth.isAdmin && (
              <button className={`staff-tab${staffTab === 'admin' ? ' active' : ''}`} onClick={() => setStaffTab('admin')}>⚙️ Admin</button>
            )}
            {auth.isAdmin && (
              <button className={`staff-tab${staffTab === 'team'   ? ' active' : ''}`} onClick={() => setStaffTab('team')}>👥 Team</button>
            )}
          </div>

          {staffTab === 'report' && (
            <TicketForm
              creatorName={auth.staffName!}
              isOnline={sync.isOnline}
              queueTicket={sync.queueTicket}
            />
          )}
          {staffTab === 'feed' && (
            <TicketList
              tickets={tickets}
              loading={loading}
              pending={sync.pending}
              onRefresh={refetch}
              staffName={auth.staffName!}
              updateTicketOptimistic={updateTicketOptimistic}
            />
          )}
          {staffTab === 'admin' && auth.isAdmin && (
            <AdminPanel
              tickets={tickets}
              staffName={auth.staffName!}
              isAdmin={auth.isAdmin}
              updateTicketOptimistic={updateTicketOptimistic}
            />
          )}
          {staffTab === 'team' && auth.isAdmin && <StaffManager isAdmin={auth.isAdmin} />}
        </div>
      )}
      {/* ── Live Pin Map ────────────────────────────────────────────────── */}
      <div className="map-section">
        <div className="map-title">{dict.mapTitle}</div>
        <div className="map-grid">
          {/* Blocks A, B, C row */}
          <div className="map-row">
            <div className="building-shape color-c">
              <span className="building-label">C</span>
              <div className="building-box">
                <div className={`pin bg-c${activePins.has('c') ? ' active' : ''}`} />
              </div>
            </div>
            <div className="building-shape color-b">
              <span className="building-label">B</span>
              <div className="building-box">
                <div className={`pin bg-b${activePins.has('b') ? ' active' : ''}`} />
              </div>
            </div>
            <div className="building-shape color-a">
              <span className="building-label">A</span>
              <div className="building-box">
                <div className={`pin bg-a${activePins.has('a') ? ' active' : ''}`} />
              </div>
            </div>
          </div>
          {/* Dome 03 row */}
          <div className="map-row">
            <div className="building-shape color-d3">
              <div className="tent-box">
                <div className={`pin bg-d3${activePins.has('d3') ? ' active' : ''}`} />
              </div>
              <span className="building-label">03</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Venue Gallery ───────────────────────────────────────────────── */}
      <div className="venue-gallery">
        <h3>{dict.galleryTitle}</h3>
        <div className="gallery-scroll">
          <img
            src="images/photo1.jpg"
            alt="Venue Photo 1"
            className="venue-img"
            loading="lazy"
            onClick={() => setModalSrc('images/photo1.jpg')}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <img
            src="images/photo2.jpg"
            alt="Venue Photo 2"
            className="venue-img"
            loading="lazy"
            onClick={() => setModalSrc('images/photo2.jpg')}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <input
        type="text"
        className="search-box"
        placeholder={dict.searchPlaceholder}
        value={searchTerm}
        onChange={e => { setSearchTerm(e.target.value); setCategory('All'); }}
      />

      {/* ── Category Filters ────────────────────────────────────────────── */}
      <div className="filters">
        {categoriesList.map(cat => {
          const isActive = cat.id === category;
          const label = cat.icon
            ? `${cat.icon} ${dict.categories[cat.id]}`
            : dict.categories[cat.id];
          return (
            <button
              key={cat.id}
              className={`filter-btn${isActive ? ' active' : ''}`}
              onClick={() => setCategory(cat.id)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Directory List ───────────────────────────────────────────────── */}
      <div className="directory-list">
        {filteredData.length === 0 ? (
          <div className="no-results">{dict.noResults}</div>
        ) : (
          filteredData.map((item, idx) => {
            const colorCode = getLocationClass(item.block);
            const displayDept  = lang === 'en' ? item.dept  : item.deptHi;
            const displayLoc   = lang === 'en' ? item.loc   : item.locHi;
            const displayBlock = localiseBlock(item.block, lang);
            return (
              <div key={idx} className={`card color-${colorCode}`}>
                <div className="card-left">
                  <div className="card-icon">{item.icon}</div>
                  <div>
                    <h3 className="card-title">{displayDept}</h3>
                    <p className="card-subtitle">
                      <span className={`color-${colorCode}`}>{displayBlock}</span>
                      <span>•</span>
                      <span>{displayLoc}</span>
                    </p>
                  </div>
                </div>
                <div className={`location-badge bg-${colorCode}`}>
                  {dict.roomLabel} {item.room}
                </div>
              </div>
            );
          })
        )}
      </div>


      {/* ── Login Modal ───────────────────────────────────────────────── */}
      {showLogin && !auth.isAuthenticated && (
        <LoginModal
          onLogin={async (pin) => {
            const ok = await auth.login(pin);
            if (ok) { setShowLogin(false); setShowStaff(true); }
            return ok;
          }}
          loading={auth.loading}
          error={auth.error}
          onClose={() => setShowLogin(false)}
        />
      )}

      {/* ── Image Lightbox Modal ─────────────────────────────────────────── */}
      {modalSrc && (
        <div className="modal-overlay" onClick={() => setModalSrc(null)}>
          <button
            className="close-modal"
            onClick={() => setModalSrc(null)}
            aria-label="Close"
          >
            &times;
          </button>
          <img
            className="modal-content"
            src={modalSrc}
            alt="Full screen venue"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
