import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserCircle, Settings, LogOut, 
  LayoutDashboard, Plus, Edit2, Trash2, Search, 
  ChevronUp, ChevronDown, UploadCloud, Printer, CheckCircle, XCircle, FileText, MapPin, Save, Clock, FileSpreadsheet, Download
} from 'lucide-react';

// Memperbarui import untuk memastikan instalasi modul berjalan ulang tanpa cache error
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { 
  getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, addDoc
} from 'firebase/firestore';

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Jalur database produksi
const getCollectionPath = (colName) => `${colName}`;
const getDocRef = (colName, docId) => doc(db, colName, docId);

// --- HELPER UNTUK FORM DATA JEMAAT ---
const toCamelCase = (str) => {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
};

const formDataJemaatGroups = {
  "Administrasi & Kependudukan": ["Jumlah Lingkungan", "Jumlah Rayon", "Jumlah KK", "Jiwa L", "Jiwa P"],
  "Keanggotaan Gereja": ["Anggota Baptis L", "Anggota Baptis P", "Anggota Sidi L", "Anggota Sidi P"],
  "Pernikahan": ["Pasangan Nikah Adat", "Pasangan Nikah Masehi", "Pasangan Nikah BS"],
  "Pendidikan": ["Tidak Belum Sekolah", "Tidak Tamat SD", "SD", "SMP sederajat", "SMA sederajat", "D I", "D II", "D III", "D IV", "S1", "S2", "S3"],
  "Kondisi Khusus": ["Janda", "Duda", "Yatim", "Piatu", "Yatim Piatu", "Disabilitas"],
  "Pekerjaan": ["Tidak Belum bekerja", "Ibu Rumah Tangga", "Pelajar", "Mahasiswa", "Pensiunan", "PNS", "TNI", "POLRI", "Tenaga Kontrak Honorer", "Karyawan BUMN BUMD", "Karyawan Swasta", "Pembantu Rumah Tangga", "Buruh Kondektur Serabutan", "Petani", "Peternak", "Nelayan", "Pedangan besar toko", "Pedangan kecil kios", "Pengrajin Indusrti", "Penjahit Penata Busana", "Tukang Cukur Penata Rias", "Seniman Artis", "Konsultan", "Kontraktor", "Pekerja Migran TKI TKW", "Wiraswasta lainnya", "Guru", "Dosen", "Wartawan", "Pendeta", "Dokter", "Bidan Perawat", "Apoteker", "Pengacara Notaris", "Pejabat Negara Legislatif", "Tukang kayu batu besi", "Sopir Operator", "Mekanik Tukang Listrik", "Arsitek", "Akuntan", "Penyiar TV Radio", "Profesional lainnya"]
};

const generateDefaultDataJemaat = (jemaatId) => {
  let defaultData = { jemaatId, catatan: '' };
  Object.values(formDataJemaatGroups).flat().forEach(label => {
    defaultData[toCamelCase(label)] = 0;
  });
  return defaultData;
};

const extractIframeSrc = (text) => {
  if(!text) return '';
  const match = text.match(/src="([^"]+)"/);
  return match ? match[1] : text;
};

// --- UI COMPONENTS ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-6 ${className}`}>{children}</div>
);

const Button = ({ children, onClick, variant = 'primary', className = "", type = "button", disabled = false }) => {
  const baseStyle = "px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm shadow-indigo-200",
    success: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-200",
    danger: "bg-rose-500 hover:bg-rose-600 text-white shadow-sm shadow-rose-200",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700",
    outline: "border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50"
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>{children}</button>;
};

const Input = ({ label, type = "text", value, onChange, placeholder, required = false, className="" }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    {label && <label className="text-sm font-semibold text-slate-600 ml-1">{label} {required && <span className="text-rose-500">*</span>}</label>}
    <input type={type} value={value} onChange={onChange} required={required} placeholder={placeholder} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all" />
  </div>
);

const Select = ({ label, value, onChange, options, required = false, className="" }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    {label && <label className="text-sm font-semibold text-slate-600 ml-1">{label} {required && <span className="text-rose-500">*</span>}</label>}
    <select value={value} onChange={onChange} required={required} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all">
      <option value="">Pilih...</option>
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

const ImageUpload = ({ label, onImageSelected, currentImage, required }) => {
  const [preview, setPreview] = useState(currentImage || null);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) return setError("Ukuran file maksimal 1MB");
    
    const reader = new FileReader();
    reader.onloadend = () => { setPreview(reader.result); onImageSelected(reader.result); setError(""); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm font-semibold text-slate-600 ml-1">{label} {required && <span className="text-rose-500">*</span>}</label>}
      <div className="flex items-center gap-4">
        <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-slate-300 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
          {preview ? <img src={preview} alt="Preview" className="h-full w-full object-cover" /> : <UserCircle className="text-slate-300 h-10 w-10" />}
        </div>
        <div className="flex-1">
          <input type="file" accept="image/jpeg, image/png" onChange={handleFileChange} className="hidden" id="image-upload-input" />
          <label htmlFor="image-upload-input" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl cursor-pointer hover:bg-indigo-100 transition-colors font-medium text-sm">
            <UploadCloud size={18} /> Pilih Foto
          </label>
          <p className="text-xs text-slate-500 mt-2">Format: JPG/PNG. Maks 1MB.</p>
          {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
        </div>
      </div>
    </div>
  );
};

// --- GRID PAGINATION COMPONENT ---
const CardGrid = ({ data, renderItem, itemsPerPage = 8, emptyMessage = "Tidak ada data", customFilter }) => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(item => Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase())));
  }, [data, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  useEffect(() => { setPage(1); }, [searchTerm, customFilter]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" placeholder="Cari..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none"
          />
        </div>
        {customFilter}
      </div>
      
      {paginatedData.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">{emptyMessage}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {paginatedData.map(renderItem)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-between items-center text-sm text-slate-500 border-t border-slate-100 pt-4">
          <span>Menampilkan {(page-1)*itemsPerPage + 1} - {Math.min(page*itemsPerPage, filteredData.length)} dari {filteredData.length}</span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Sebelumnnya</Button>
            <span className="flex items-center px-3 font-semibold text-slate-700">Hal {page} / {totalPages}</span>
            <Button variant="secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Selanjutnya</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- DATA TABLE COMPONENT ---
const DataTable = ({ columns, data, onEdit, onDelete, onPrint, onDownloadExcel, title, showPrint = true, printColumns, customFilter, customAction }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });

  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (searchTerm) sortableItems = sortableItems.filter(item => Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase())));
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key] || ''; const bVal = b[sortConfig.key] || '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig, searchTerm]);

  const paginatedData = useMemo(() => {
    if (pagination.limit === 'All') return sortedData;
    const startIndex = (pagination.page - 1) * pagination.limit;
    return sortedData.slice(startIndex, startIndex + pagination.limit);
  }, [sortedData, pagination]);

  const requestSort = (key) => setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc' });

  const handlePrintTable = () => {
    const colsToPrint = printColumns || columns;
    const printWindow = window.open('', '', 'width=1200,height=800');
    printWindow.document.write(`
      <html><head><title>Cetak Laporan - ${title}</title>
      <style>
        @page { size: landscape; margin: 10mm; }
        body { font-family: sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
        th, td { border: 1px solid #ddd; padding: 5px; text-align: center; }
        th { background-color: #f4f4f4; white-space: normal; word-wrap: break-word; }
        th:first-child, td:first-child { text-align: left; white-space: nowrap; }
        h2 { text-align: center; color: #333; margin-bottom: 5px; }
        p { text-align: center; color: #666; font-size: 12px; }
      </style></head><body>
      <h2>Laporan ${title}</h2><p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
      <table><thead><tr>${colsToPrint.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
      <tbody>${sortedData.map(row => `<tr>${colsToPrint.map(c => `<td>${c.render ? c.render(row[c.key], row) : row[c.key] || '-'}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></body></html>
    `);
    printWindow.document.close();
    printWindow.setTimeout(() => { printWindow.print(); }, 500);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
        <div className="flex gap-2 w-full sm:w-auto flex-1 items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Cari data..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 outline-none" />
          </div>
          {customFilter}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {customAction}
          {onDownloadExcel && <Button variant="secondary" onClick={onDownloadExcel} className="flex-1 sm:flex-none bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 border border-solid"><Download size={18} /> Download Excel</Button>}
          {showPrint && <Button variant="secondary" onClick={handlePrintTable} className="flex-1 sm:flex-none"><Printer size={18} /> Cetak Tabel</Button>}
          <Select value={pagination.limit} onChange={(e) => setPagination(p => ({ ...p, limit: e.target.value === 'All' ? 'All' : Number(e.target.value), page: 1 }))}
            options={[{label: '10 Baris', value: 10}, {label: '20 Baris', value: 20}, {label: 'Semua', value: 'All'}]} className="w-32" />
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 font-semibold cursor-pointer hover:bg-slate-100 whitespace-nowrap" onClick={() => requestSort(col.key)}>
                  <div className="flex items-center justify-between gap-2">{col.label}
                    {sortConfig.key === col.key ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronUp size={14} className="opacity-0" />}
                  </div>
                </th>
              ))}
              {(onEdit || onDelete || onPrint) && <th className="px-4 py-3 font-semibold text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700">
            {paginatedData.length === 0 ? <tr><td colSpan={columns.length + 1} className="text-center py-8 text-slate-500">Tidak ada data</td></tr> :
              paginatedData.map((row, i) => (
                <tr key={row.id || i} className="border-b border-slate-100 hover:bg-slate-50">
                  {columns.map(col => <td key={col.key} className="px-4 py-3 whitespace-nowrap">{col.render ? col.render(row[col.key], row) : row[col.key] || '-'}</td>)}
                  {(onEdit || onDelete || onPrint) && (
                    <td className="px-4 py-3 flex gap-2 justify-end">
                      {onPrint && <button onClick={() => onPrint(row)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="Cetak Form Lengkap"><Printer size={16} /></button>}
                      {onEdit && <button onClick={() => onEdit(row)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg" title="Edit Data"><Edit2 size={16} /></button>}
                      {onDelete && <button onClick={() => onDelete(row.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg" title="Hapus Data"><Trash2 size={16} /></button>}
                    </td>
                  )}
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- MAIN APPLICATION ---
export default function App() {
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState(null);

  const [masterJemaat, setMasterJemaat] = useState([]);
  const [masterPendeta, setMasterPendeta] = useState([]);
  const [dataJemaat, setDataJemaat] = useState([]);
  const [profilJemaat, setProfilJemaat] = useState([]);
  const [profilPendeta, setProfilPendeta] = useState([]);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    const initApp = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
        setIsFirebaseReady(true);
      } catch (error) { console.error("Auth error:", error); alert("Gagal terhubung ke database."); }
    };
    initApp();
  }, []);

  useEffect(() => {
    if (!isFirebaseReady) return;
    const subscribeToCol = (colName, setter) => onSnapshot(collection(db, getCollectionPath(colName)), (snapshot) => setter(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))), (err) => console.error(err));
    const unsubscribers = [
      subscribeToCol('master_jemaat', setMasterJemaat),
      subscribeToCol('master_pendeta', setMasterPendeta),
      subscribeToCol('data_jemaat', setDataJemaat),
      subscribeToCol('profil_jemaat', setProfilJemaat),
      subscribeToCol('profil_pendeta', setProfilPendeta)
    ];
    return () => unsubscribers.forEach(unsub => unsub());
  }, [isFirebaseReady]);

  const handleSave = async (colName, data, id = null) => {
    try {
      if (id) await setDoc(getDocRef(colName, id), data, { merge: true });
      else await addDoc(collection(db, getCollectionPath(colName)), data);
      showToast('Data berhasil disimpan');
      return true;
    } catch (e) { showToast('Gagal menyimpan data', 'error'); return false; }
  };

  const handleDelete = async (colName, id) => {
    if(!window.confirm("Yakin ingin menghapus data ini?")) return;
    try { await deleteDoc(getDocRef(colName, id)); showToast('Data berhasil dihapus'); } 
    catch (e) { showToast('Gagal menghapus data', 'error'); }
  };

  // --- VIEWS ---

  const LoginView = () => {
    const [role, setRole] = useState('Admin');
    const [loginTeritori, setLoginTeritori] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    const handleLogin = (e) => {
      e.preventDefault();
      setLoginError('');
      if (role === 'Admin') {
        if (username === 'admin' && password === 'admin') setCurrentUser({ id: 'admin', role: 'Admin', name: 'Administrator' });
        else setLoginError('Username atau password Admin salah!');
      } else if (role === 'Jemaat') {
        const jemaat = masterJemaat.find(j => j.id === username);
        if (jemaat && jemaat.password === password) setCurrentUser({ id: jemaat.id, role: 'Jemaat', name: jemaat.name });
        else setLoginError('Pilihan Jemaat atau password salah!');
      } else if (role === 'Pendeta') {
        const pendeta = masterPendeta.find(p => p.id === username);
        if (pendeta && pendeta.password === password) setCurrentUser({ id: pendeta.id, role: 'Pendeta', name: pendeta.name });
        else setLoginError('Pilihan Pendeta atau password salah!');
      }
    };

    const jemaatOptions = masterJemaat
      .filter(j => !loginTeritori || j.teritori === loginTeritori)
      .map(item => ({label: item.name, value: item.id}));

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
        <Card className="w-full max-w-md">
          <div className="text-center mb-6">
            <img src="https://i.imgur.com/XV3hpOH.png" alt="Logo" className="w-32 h-32 object-contain mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-800 leading-tight">Sistem Informasi Jemaat</h1>
            <p className="text-slate-500 font-semibold mt-1 uppercase tracking-wider text-sm">Klasis Mollo Barat</p>
          </div>
          
          {loginError && (
             <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl mb-6 text-sm font-semibold flex items-center gap-2">
                <XCircle size={18} className="shrink-0"/>
                <span>{loginError}</span>
             </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Select label="Masuk Sebagai" value={role} onChange={(e) => { setRole(e.target.value); setUsername(''); setPassword(''); setLoginTeritori(''); setLoginError(''); }}
              options={[{label: 'Admin', value: 'Admin'}, {label: 'Jemaat', value: 'Jemaat'}, {label: 'Pendeta', value: 'Pendeta'}]} required />
            
            {role === 'Jemaat' && (
              <Select label="Teritori (Opsional)" value={loginTeritori} onChange={(e) => { setLoginTeritori(e.target.value); setUsername(''); setLoginError(''); }}
                options={[{label: 'Selatan', value: 'Selatan'}, {label: 'Tengah', value: 'Tengah'}, {label: 'Barat', value: 'Barat'}]} />
            )}

            {role === 'Admin' ? <Input label="Username" value={username} onChange={(e)=>{setUsername(e.target.value); setLoginError('');}} required /> :
             role === 'Jemaat' ? <Select label="Nama Jemaat" value={username} onChange={(e)=>{setUsername(e.target.value); setLoginError('');}} options={jemaatOptions} required /> :
             <Select label="Nama Pendeta" value={username} onChange={(e)=>{setUsername(e.target.value); setLoginError('');}} options={masterPendeta.map(item => ({label: item.name, value: item.id}))} required />
            }
            <Input label="Password" type="password" value={password} onChange={(e)=>{setPassword(e.target.value); setLoginError('');}} required />
            <Button type="submit" className="w-full mt-6 py-3 text-lg">Masuk</Button>
          </form>
        </Card>
      </div>
    );
  };

  const DashboardView = () => {
    // Group 1 Calculations
    const totalKK = dataJemaat.reduce((acc, curr) => acc + (Number(curr.jumlahKK) || 0), 0);
    const jiwaL = dataJemaat.reduce((acc, curr) => acc + (Number(curr.jiwaL) || 0), 0);
    const jiwaP = dataJemaat.reduce((acc, curr) => acc + (Number(curr.jiwaP) || 0), 0);
    const totalJiwa = jiwaL + jiwaP;

    // Group 2 Calculations
    const totalJemaat = masterJemaat.filter(j => j.status === 'Jemaat').length;
    const totalMataJemaat = masterJemaat.filter(j => j.status === 'Jemaat Bermata Jemaat').length;
    const totalPosPelayanan = masterJemaat.filter(j => j.status === 'Pos Pelayanan').length;
    
    // Group 3 Calculations
    const pendetaL = masterPendeta.filter(p => p.jenisKelamin === 'L').length;
    const pendetaP = masterPendeta.filter(p => p.jenisKelamin === 'P').length;
    const totalPendeta = masterPendeta.length;

    const StatCard = ({ title, value, colorClass }) => (
      <Card className="flex items-center gap-4 p-5">
        <div className={`w-2 h-12 rounded-full ${colorClass}`}></div>
        <div>
          <p className="text-sm font-semibold text-slate-500 mb-0.5">{title}</p>
          <p className="text-3xl font-bold text-slate-800">{value}</p>
        </div>
      </Card>
    );

    return (
      <div className="space-y-8">
        <div className="mb-6">
           <h2 className="text-3xl font-bold text-indigo-900">Shalom, {currentUser.name}!</h2>
           <p className="text-slate-500 text-lg mt-1">Selamat datang di Infografis & Ringkasan Realtime</p>
        </div>
        
        {/* Grup 1: Populasi */}
        <div>
          <h3 className="font-bold text-lg text-slate-700 mb-4 flex items-center gap-2"><Users size={20} className="text-indigo-600"/> Populasi Jemaat</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Jumlah KK" value={totalKK} colorClass="bg-emerald-500" />
            <StatCard title="Jiwa Laki-laki" value={jiwaL} colorClass="bg-blue-500" />
            <StatCard title="Jiwa Perempuan" value={jiwaP} colorClass="bg-pink-500" />
            <StatCard title="Total Jiwa" value={totalJiwa} colorClass="bg-orange-500" />
          </div>
        </div>

        {/* Grup 2: Status */}
        <div>
          <h3 className="font-bold text-lg text-slate-700 mb-4 flex items-center gap-2 mt-2"><MapPin size={20} className="text-indigo-600"/> Status Jemaat</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Jemaat (Mandiri)" value={totalJemaat} colorClass="bg-indigo-500" />
            <StatCard title="Jemaat Bermata Jemaat" value={totalMataJemaat} colorClass="bg-purple-500" />
            <StatCard title="Pos Pelayanan" value={totalPosPelayanan} colorClass="bg-sky-500" />
          </div>
        </div>

        {/* Grup 3: Pelayan */}
        <div>
          <h3 className="font-bold text-lg text-slate-700 mb-4 flex items-center gap-2 mt-2"><UserCircle size={20} className="text-indigo-600"/> Pelayan (Pendeta)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Pendeta Laki-laki" value={pendetaL} colorClass="bg-blue-600" />
            <StatCard title="Pendeta Perempuan" value={pendetaP} colorClass="bg-pink-600" />
            <StatCard title="Jumlah Pendeta" value={totalPendeta} colorClass="bg-slate-700" />
          </div>
        </div>
      </div>
    );
  };

  // --- EXCEL-LIKE SPREADSHEET EDITOR ---
  const AdminSettingsView = () => {
    const [tab, setTab] = useState('jemaat');
    const [localJemaat, setLocalJemaat] = useState([]);
    const [localPendeta, setLocalPendeta] = useState([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Initialize local grids
    useEffect(() => {
      if(!hasChanges) {
        setLocalJemaat([...masterJemaat, ...Array(5).fill().map(() => ({id: `new-${crypto.randomUUID()}`, isNew: true, name:'', teritori:'', status:'', password:''}))]);
        setLocalPendeta([...masterPendeta, ...Array(5).fill().map(() => ({id: `new-${crypto.randomUUID()}`, isNew: true, name:'', jenisKelamin:'', password:''}))]);
      }
    }, [masterJemaat, masterPendeta, hasChanges]);

    const handleChange = (type, id, field, value) => {
      setHasChanges(true);
      if(type === 'jemaat') {
        setLocalJemaat(prev => prev.map(r => r.id === id ? {...r, [field]: value} : r));
      } else {
        setLocalPendeta(prev => prev.map(r => r.id === id ? {...r, [field]: value} : r));
      }
    };

    const handlePaste = (e, type, startRowIndex) => {
      const text = e.clipboardData.getData('text');
      if(!text.includes('\t') && !text.includes('\n')) return; // let native paste handle single cell
      e.preventDefault();
      setHasChanges(true);

      const rows = text.split('\n').map(r => r.split('\t'));
      const keys = type === 'jemaat' ? ['name', 'teritori', 'status', 'password'] : ['name', 'jenisKelamin', 'password'];

      const updater = (prev) => {
        const newData = [...prev];
        rows.forEach((rowVals, i) => {
           if(!rowVals.join('').trim()) return;
           const targetIdx = startRowIndex + i;
           if(!newData[targetIdx]) {
              newData.push({id: `new-${crypto.randomUUID()}`, isNew: true, name:'', teritori:'', status:'', password:'', jenisKelamin:''});
           }
           keys.forEach((k, j) => {
              if(rowVals[j] !== undefined) newData[targetIdx][k] = rowVals[j].trim();
           });
        });
        return newData;
      };

      if(type === 'jemaat') setLocalJemaat(updater);
      else setLocalPendeta(updater);
    };

    const handleDeleteRow = async (id, isNew, type) => {
      if(!isNew) {
        if(window.confirm("Yakin ingin menghapus baris ini dari database?")) {
           try { await deleteDoc(getDocRef(type === 'jemaat' ? 'master_jemaat' : 'master_pendeta', id)); showToast('Data dihapus'); } 
           catch (e) { showToast('Gagal menghapus data', 'error'); return; }
        } else return;
      }
      setHasChanges(true);
      if(type === 'jemaat') setLocalJemaat(prev => prev.filter(r => r.id !== id));
      else setLocalPendeta(prev => prev.filter(r => r.id !== id));
    };

    const handleSaveAll = async () => {
      setIsSaving(true);
      try {
        const dataToSave = tab === 'jemaat' ? localJemaat : localPendeta;
        const colName = tab === 'jemaat' ? 'master_jemaat' : 'master_pendeta';
        
        const promises = dataToSave.filter(r => r.name && r.name.trim() !== '').map(r => {
           const { id, isNew, ...saveData } = r;
           if(isNew) return addDoc(collection(db, getCollectionPath(colName)), saveData);
           else return setDoc(getDocRef(colName, id), saveData, { merge: true });
        });
        
        await Promise.all(promises);
        setHasChanges(false); 
        showToast('Semua perubahan berhasil disimpan!');
      } catch (e) {
        showToast('Terjadi kesalahan saat menyimpan', 'error');
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <div className="space-y-6">
        <datalist id="teritori-list"><option value="Selatan"/><option value="Tengah"/><option value="Barat"/></datalist>
        <datalist id="status-list"><option value="Jemaat"/><option value="Jemaat Bermata Jemaat"/><option value="Pos Pelayanan"/></datalist>
        <datalist id="gender-list"><option value="L"/><option value="P"/></datalist>

        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Tabel Master Data</h2>
            <p className="text-sm text-slate-500">Tersambung Real-time ke Database. Klik sel pertama, lalu <strong>Paste dari Excel</strong></p>
          </div>
          <Button onClick={handleSaveAll} variant="success" disabled={!hasChanges || isSaving} className="px-6">
            <Save size={18} /> {isSaving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
          </Button>
        </div>

        <div className="flex border-b border-slate-200 gap-2 px-1">
          <button className={`px-5 py-3 font-semibold rounded-t-xl transition-all ${tab === 'jemaat' ? 'bg-white text-indigo-600 border-t border-l border-r border-slate-200' : 'text-slate-500 hover:bg-slate-100'}`} onClick={() => setTab('jemaat')}>Master Jemaat</button>
          <button className={`px-5 py-3 font-semibold rounded-t-xl transition-all ${tab === 'pendeta' ? 'bg-white text-indigo-600 border-t border-l border-r border-slate-200' : 'text-slate-500 hover:bg-slate-100'}`} onClick={() => setTab('pendeta')}>Master Pendeta</button>
        </div>

        <Card className="p-0 overflow-hidden rounded-t-none border-t-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-sm border-b-2 border-slate-200">
                  {tab === 'jemaat' ? (
                    <>
                      <th className="px-4 py-3 font-bold border-r border-slate-200 w-1/3">Nama Jemaat</th>
                      <th className="px-4 py-3 font-bold border-r border-slate-200">Teritori</th>
                      <th className="px-4 py-3 font-bold border-r border-slate-200">Status</th>
                      <th className="px-4 py-3 font-bold border-r border-slate-200">Password</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 font-bold border-r border-slate-200 w-1/2">Nama Pendeta</th>
                      <th className="px-4 py-3 font-bold border-r border-slate-200">Gender (L/P)</th>
                      <th className="px-4 py-3 font-bold border-r border-slate-200">Password</th>
                    </>
                  )}
                  <th className="px-4 py-3 font-bold text-center w-16">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {(tab === 'jemaat' ? localJemaat : localPendeta).map((row, idx) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-indigo-50/50 transition-colors group">
                    {tab === 'jemaat' ? (
                      <>
                        <td className="p-0 border-r border-slate-100">
                          <input type="text" value={row.name||''} onChange={e=>handleChange('jemaat', row.id, 'name', e.target.value)} onPaste={e=>handlePaste(e, 'jemaat', idx)} className="w-full px-4 py-3 bg-transparent outline-none focus:bg-white focus:ring-inset focus:ring-2 focus:ring-indigo-300" placeholder="Ketik nama jemaat..." />
                        </td>
                        <td className="p-0 border-r border-slate-100">
                          <input type="text" list="teritori-list" value={row.teritori||''} onChange={e=>handleChange('jemaat', row.id, 'teritori', e.target.value)} onPaste={e=>handlePaste(e, 'jemaat', idx)} className="w-full px-4 py-3 bg-transparent outline-none focus:bg-white focus:ring-inset focus:ring-2 focus:ring-indigo-300" placeholder="Selatan/Tengah/Barat" />
                        </td>
                        <td className="p-0 border-r border-slate-100">
                          <input type="text" list="status-list" value={row.status||''} onChange={e=>handleChange('jemaat', row.id, 'status', e.target.value)} onPaste={e=>handlePaste(e, 'jemaat', idx)} className="w-full px-4 py-3 bg-transparent outline-none focus:bg-white focus:ring-inset focus:ring-2 focus:ring-indigo-300" placeholder="Jemaat / Pos..." />
                        </td>
                        <td className="p-0 border-r border-slate-100">
                          <input type="text" value={row.password||''} onChange={e=>handleChange('jemaat', row.id, 'password', e.target.value)} onPaste={e=>handlePaste(e, 'jemaat', idx)} className="w-full px-4 py-3 bg-transparent outline-none focus:bg-white focus:ring-inset focus:ring-2 focus:ring-indigo-300 text-slate-500 font-mono text-xs" placeholder="********" />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-0 border-r border-slate-100">
                          <input type="text" value={row.name||''} onChange={e=>handleChange('pendeta', row.id, 'name', e.target.value)} onPaste={e=>handlePaste(e, 'pendeta', idx)} className="w-full px-4 py-3 bg-transparent outline-none focus:bg-white focus:ring-inset focus:ring-2 focus:ring-indigo-300" placeholder="Ketik nama pendeta..." />
                        </td>
                        <td className="p-0 border-r border-slate-100">
                          <input type="text" list="gender-list" value={row.jenisKelamin||''} onChange={e=>handleChange('pendeta', row.id, 'jenisKelamin', e.target.value)} onPaste={e=>handlePaste(e, 'pendeta', idx)} className="w-full px-4 py-3 bg-transparent outline-none focus:bg-white focus:ring-inset focus:ring-2 focus:ring-indigo-300" placeholder="L / P" />
                        </td>
                        <td className="p-0 border-r border-slate-100">
                          <input type="text" value={row.password||''} onChange={e=>handleChange('pendeta', row.id, 'password', e.target.value)} onPaste={e=>handlePaste(e, 'pendeta', idx)} className="w-full px-4 py-3 bg-transparent outline-none focus:bg-white focus:ring-inset focus:ring-2 focus:ring-indigo-300 text-slate-500 font-mono text-xs" placeholder="********" />
                        </td>
                      </>
                    )}
                    <td className="p-2 text-center">
                      <button onClick={() => handleDeleteRow(row.id, row.isNew, tab)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
            <button onClick={() => {
              setHasChanges(true);
              if(tab === 'jemaat') setLocalJemaat(p => [...p, {id: `new-${crypto.randomUUID()}`, isNew: true, name:'', teritori:'', status:'', password:''}]);
              else setLocalPendeta(p => [...p, {id: `new-${crypto.randomUUID()}`, isNew: true, name:'', jenisKelamin:'', password:''}]);
            }} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-2 w-full"><Plus size={16}/> Tambah Baris Kosong</button>
          </div>
        </Card>
      </div>
    );
  };

  const DataJemaatView = () => {
    const [formData, setFormData] = useState(null);
    const [filterTeritori, setFilterTeritori] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);
    const [importText, setImportText] = useState('');
    
    const isAdmin = currentUser.role === 'Admin';
    const isJemaat = currentUser.role === 'Jemaat';

    // Memetakan data dari database dengan nama & teritori jemaat
    const mappedData = useMemo(() => {
       return dataJemaat.map(d => {
          const jemaat = masterJemaat.find(j => j.id === d.jemaatId) || {};
          return { ...d, jemaatName: jemaat.name || 'Unknown', teritori: jemaat.teritori || '-', status: jemaat.status || '-' };
       });
    }, [dataJemaat, masterJemaat]);
    
    const visibleData = useMemo(() => {
       return mappedData.filter(d => {
          if (isJemaat && d.jemaatId !== currentUser.id) return false;
          if (filterTeritori && d.teritori !== filterTeritori) return false;
          return true;
       });
    }, [mappedData, isJemaat, filterTeritori, currentUser]);

    // Kolom-kolom lengkap untuk mode cetak tabel/download Excel
    const printCols = useMemo(() => {
       const cols = [
         { key: 'jemaatName', label: 'Nama Jemaat' },
         { key: 'teritori', label: 'Teritori' },
         { key: 'status', label: 'Status' },
       ];
       Object.values(formDataJemaatGroups).flat().forEach(label => {
         cols.push({ key: toCamelCase(label), label: label });
       });
       return cols;
    }, []);

    const openForm = (item = null) => {
      if (item) setFormData(item);
      else setFormData(generateDefaultDataJemaat(isAdmin ? '' : currentUser.id));
    };

    const submitForm = async (e) => {
      e.preventDefault();
      const success = await handleSave('data_jemaat', formData, formData.id);
      if(success) setFormData(null);
    };

    const handleImportCSV = async () => {
      if(!importText.trim()) return;
      const rows = importText.split('\n').map(r => r.split('\t'));
      if(rows.length < 2) { showToast('Data Excel tidak valid / kosong', 'error'); return; }
      
      const headers = rows[0].map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
      const nameIdx = headers.findIndex(h => h.includes('nama'));
      
      if(nameIdx === -1) { showToast('Kolom "Nama" jemaat tidak ditemukan di baris judul', 'error'); return; }

      let successCount = 0;
      for(let i=1; i<rows.length; i++) {
          const cols = rows[i];
          if(cols.length < 2) continue;
          
          const jemaatName = cols[nameIdx]?.trim().toLowerCase();
          if(!jemaatName) continue;
          
          const jemaat = masterJemaat.find(j => j.name.toLowerCase() === jemaatName);
          if(jemaat) {
              let newData = generateDefaultDataJemaat(jemaat.id);
              const existing = dataJemaat.find(d => d.jemaatId === jemaat.id);
              if(existing) newData = { ...existing };

              headers.forEach((h, idx) => {
                  const val = parseInt(cols[idx]?.trim(), 10) || 0;
                  Object.values(formDataJemaatGroups).flat().forEach(label => {
                      const cleanLabel = label.toLowerCase().replace(/[^a-z0-9]/g, '');
                      if(h === cleanLabel || h.includes(cleanLabel) || cleanLabel.includes(h)) {
                          newData[toCamelCase(label)] = val;
                      }
                  });
              });

              try {
                 if(existing) await setDoc(getDocRef('data_jemaat', existing.id), newData, {merge: true});
                 else await addDoc(collection(db, getCollectionPath('data_jemaat')), newData);
                 successCount++;
              } catch(e) { console.error(e); }
          }
      }
      showToast(`Berhasil mengimport ${successCount} data jemaat ke Database`);
      setShowImportModal(false);
      setImportText('');
    };

    // Fungsi Cetak Form per Jemaat (Aksi Row)
    const handlePrintFormDetail = (row) => {
      const printWindow = window.open('', '', 'width=800,height=800');
      let formHtml = `<h3 style="text-align:center; border-bottom: 2px solid #333; padding-bottom: 10px;">Formulir Data Jemaat: <br/><span style="color:#4f46e5">${row.jemaatName}</span></h3>`;
      
      Object.entries(formDataJemaatGroups).forEach(([groupName, fields]) => {
          formHtml += `<div style="margin-bottom: 20px; page-break-inside: avoid;">
                         <h4 style="margin-bottom: 5px; background: #f4f4f4; padding: 8px; border-radius: 4px;">${groupName}</h4>
                         <table style="width: 100%; border-collapse: collapse;">`;
          fields.forEach(label => {
              const key = toCamelCase(label);
              formHtml += `<tr><td style="border: 1px solid #ddd; padding: 6px; font-size: 13px;" width="60%">${label}</td><td style="border: 1px solid #ddd; padding: 6px; font-size: 14px; font-weight: bold;" width="40%">${row[key] || 0}</td></tr>`;
          });
          formHtml += `</table></div>`;
      });

      printWindow.document.write(`<html><head><title>Cetak Data - ${row.jemaatName}</title><style>body { font-family: sans-serif; padding: 20px; }</style></head><body>${formHtml}</body></html>`);
      printWindow.document.close();
      printWindow.setTimeout(() => { printWindow.print(); }, 500);
    };

    // Fungsi Download Keseluruhan menjadi File CSV (Excel)
    const handleDownloadExcel = () => {
      let csvContent = '\uFEFF'; // BOM for UTF-8 Excel compatibility
      
      // Headers
      const headers = printCols.map(c => `"${c.label}"`).join(',');
      csvContent += headers + '\n';
      
      // Rows
      visibleData.forEach(row => {
         const rowData = printCols.map(col => {
            let val = col.render ? col.render(row[col.key], row) : row[col.key];
            if (val === undefined || val === null) val = '';
            // Escape double quotes inside string
            return `"${String(val).replace(/"/g, '""')}"`;
         });
         csvContent += rowData.join(',') + '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Data_Jemaat_Klasis_Mollo_Barat.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const tableColumns = [
      { key: 'jemaatName', label: 'Nama Jemaat' },
      { key: 'teritori', label: 'Teritori' },
      { key: 'status', label: 'Status' },
      { key: 'jumlahKK', label: 'Jumlah KK' },
      { key: 'jiwaL', label: 'Jiwa L' },
      { key: 'jiwaP', label: 'Jiwa P' },
      { key: 'total', label: 'Total Jiwa', render: (_, row) => (Number(row.jiwaL) || 0) + (Number(row.jiwaP) || 0) }
    ];

    const filterUI = (
      <select value={filterTeritori} onChange={(e) => setFilterTeritori(e.target.value)} className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-none w-full sm:w-48">
        <option value="">Semua Teritori</option>
        <option value="Selatan">Selatan</option>
        <option value="Tengah">Tengah</option>
        <option value="Barat">Barat</option>
      </select>
    );

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">Data Jemaat</h2>
          {!formData && (isAdmin || isJemaat) && <Button onClick={() => openForm()}><Plus size={18} /> Tambah Data</Button>}
        </div>

        {formData ? (
          <Card>
            <h3 className="text-xl font-bold mb-6 pb-2 border-b border-slate-100">{formData.id ? 'Edit' : 'Input'} Data Lengkap Jemaat</h3>
            <form onSubmit={submitForm} className="space-y-8">
              {isAdmin && <div className="max-w-md"><Select label="Pilih Jemaat" value={formData.jemaatId} onChange={e => setFormData({...formData, jemaatId: e.target.value})} options={masterJemaat.map(j => ({label: j.name, value: j.id}))} required /></div>}
              
              {Object.entries(formDataJemaatGroups).map(([groupName, fields]) => (
                <div key={groupName} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-indigo-800 mb-4 flex items-center gap-2"><div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>{groupName}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {fields.map(label => {
                      const key = toCamelCase(label);
                      return (
                        <Input key={key} type="number" label={label} value={formData[key] || 0} onChange={e => setFormData({...formData, [key]: Number(e.target.value)})} />
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <Button type="submit" variant="success" className="px-8 text-lg">Simpan Data Jemaat</Button>
                <Button onClick={() => setFormData(null)} variant="secondary">Batal</Button>
              </div>
            </form>
          </Card>
        ) : (
          <Card>
            {currentUser.role === 'Pendeta' && <p className="text-amber-600 mb-4 bg-amber-50 p-3 rounded-lg text-sm">Pendeta hanya dapat melihat rekapitulasi data.</p>}
            <DataTable 
               title="Rekapitulasi Data Jemaat" 
               columns={tableColumns} 
               data={visibleData} 
               showPrint={false} 
               onDownloadExcel={handleDownloadExcel}
               onEdit={(isAdmin || isJemaat) ? openForm : null} 
               onDelete={isAdmin ? (id) => handleDelete('data_jemaat', id) : null} 
               onPrint={handlePrintFormDetail} 
               customFilter={filterUI}
               customAction={isAdmin && <Button variant="outline" onClick={() => setShowImportModal(true)}><FileSpreadsheet size={18} /> Import Excel</Button>}
            />
          </Card>
        )}

        {/* Modal Import CSV/Excel Khusus Data Jemaat */}
        {showImportModal && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-3xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xl font-bold flex items-center gap-2"><FileSpreadsheet className="text-emerald-500" /> Import Data Jemaat dari Excel</h3>
                 <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-rose-500"><XCircle size={24} /></button>
              </div>
              <p className="text-sm text-slate-500 mb-4">Silakan Copy seluruh tabel Data Jemaat Anda di Microsoft Excel (pastikan memblokir mulai dari baris <b>Judul Kolom</b> hingga seluruh data di bawahnya), lalu <b>Paste (Tempel)</b> di dalam kotak teks ini. Sistem akan otomatis memasukkannya ke kolom yang tepat berdasarkan Nama Jemaat.</p>
              <textarea 
                className="w-full h-64 border border-slate-200 rounded-xl p-4 text-sm font-mono whitespace-pre bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-emerald-200 transition-colors"
                placeholder="Klik di sini, lalu tekan Ctrl+V (atau Cmd+V) untuk paste tabel Excel..."
                value={importText}
                onChange={e => setImportText(e.target.value)}
              ></textarea>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="secondary" onClick={() => setShowImportModal(false)}>Batal</Button>
                <Button variant="success" onClick={handleImportCSV}>Mulai Import ke Database</Button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  };

  const ProfilJemaatView = () => {
    const [formData, setFormData] = useState(null);
    const [filterTeritori, setFilterTeritori] = useState('');
    const isAdmin = currentUser.role === 'Admin';
    
    // Urutkan profil agar profil jemaat yang sedang login berada di paling atas dan filter Teritori
    const visibleData = useMemo(() => {
      let data = profilJemaat.map(p => {
          const jemaat = masterJemaat.find(j => j.id === p.jemaatId) || {};
          return { ...p, teritori: jemaat.teritori };
      });
      if (filterTeritori) data = data.filter(d => d.teritori === filterTeritori);
      if (currentUser.role === 'Jemaat') {
         data.sort((a,b) => a.jemaatId === currentUser.id ? -1 : b.jemaatId === currentUser.id ? 1 : 0);
      }
      return data;
    }, [profilJemaat, currentUser, masterJemaat, filterTeritori]);

    const openForm = (item = null) => {
      if (item) setFormData(item);
      else setFormData({ jemaatId: isAdmin ? '' : currentUser.id, sejarah: '', waktuKebaktian: '', linkMap: '', fotoBase64: '' });
    };

    const submitForm = async (e) => {
      e.preventDefault();
      const success = await handleSave('profil_jemaat', formData, formData.id);
      if(success) setFormData(null);
    };

    const filterUI = (
      <select value={filterTeritori} onChange={(e) => setFilterTeritori(e.target.value)} className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 outline-none w-full sm:w-48">
        <option value="">Semua Teritori</option>
        <option value="Selatan">Selatan</option>
        <option value="Tengah">Tengah</option>
        <option value="Barat">Barat</option>
      </select>
    );

    const renderCard = (item) => {
      const jemaat = masterJemaat.find(j => j.id === item.jemaatId) || {};
      const isMyProfile = currentUser.id === item.jemaatId;
      const canEditThis = isAdmin || (currentUser.role === 'Jemaat' && isMyProfile);

      return (
        <div key={item.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow flex flex-col ${isMyProfile ? 'border-indigo-400 shadow-indigo-100 ring-1 ring-indigo-200' : 'border-slate-200'}`}>
          <div className="h-40 bg-slate-100 relative group">
            {item.fotoBase64 ? <img src={item.fotoBase64} className="w-full h-full object-cover" alt="Gereja" /> : <div className="flex items-center justify-center h-full text-slate-300"><img src="https://i.imgur.com/XV3hpOH.png" alt="Logo" className="w-12 h-12 opacity-50" /></div>}
            {canEditThis && (
               <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                 <button onClick={() => openForm(item)} className="p-2 bg-white/90 text-indigo-600 hover:bg-white rounded-lg shadow-sm"><Edit2 size={16} /></button>
                 {isAdmin && <button onClick={() => handleDelete('profil_jemaat', item.id)} className="p-2 bg-white/90 text-rose-600 hover:bg-white rounded-lg shadow-sm"><Trash2 size={16} /></button>}
               </div>
            )}
          </div>
          <div className="p-5 flex-1 flex flex-col">
            <h3 className="font-bold text-lg text-slate-800 leading-tight mb-1">{jemaat.name || 'Nama Tidak Diketahui'}</h3>
            <p className="text-xs font-semibold text-indigo-600 mb-3">{jemaat.status || 'Status Tidak Diketahui'} {isMyProfile && <span className="text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full ml-1 border border-rose-100">Profil Anda</span>}</p>
            
            <div className="flex items-start gap-2 text-slate-600 text-sm mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <Clock size={16} className="shrink-0 mt-0.5 text-indigo-500" /> 
              <p className="line-clamp-2 font-medium">{item.waktuKebaktian || 'Belum diatur'}</p>
            </div>

            {item.linkMap && (
               <div className="w-full h-32 bg-slate-100 rounded-xl overflow-hidden mb-3 border border-slate-200">
                 <iframe src={item.linkMap} width="100%" height="100%" style={{border: 0}} allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
               </div>
            )}
            <p className="text-slate-600 text-sm line-clamp-3 mt-auto pt-3 border-t border-slate-100">{item.sejarah}</p>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">Profil Jemaat</h2>
          {!formData && (isAdmin || currentUser.role === 'Jemaat') && <Button onClick={() => openForm()}><Plus size={18} /> Tambah Profil</Button>}
        </div>

        {formData ? (
          <Card>
            <form onSubmit={submitForm} className="space-y-4 max-w-2xl">
              {isAdmin && <Select label="Pilih Jemaat" value={formData.jemaatId} onChange={e => setFormData({...formData, jemaatId: e.target.value})} options={masterJemaat.map(j => ({label: j.name, value: j.id}))} required />}
              <Input label="Waktu Kebaktian" placeholder="Contoh: Minggu, Pkl 08.00 & 16.00" value={formData.waktuKebaktian} onChange={e => setFormData({...formData, waktuKebaktian: e.target.value})} required />
              <Input label="Link Kotak Map (Sematkan Google Maps)" placeholder='Paste url / kode iframe "src" dari Google Maps' value={formData.linkMap} onChange={e => setFormData({...formData, linkMap: extractIframeSrc(e.target.value)})} />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-600 ml-1">Sejarah Singkat Jemaat</label>
                <textarea rows={5} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none" value={formData.sejarah} onChange={e => setFormData({...formData, sejarah: e.target.value})} required></textarea>
              </div>
              <ImageUpload label="Foto Gedung Gereja / Jemaat" currentImage={formData.fotoBase64} onImageSelected={(base64) => setFormData({...formData, fotoBase64: base64})} />
              <div className="flex gap-2 pt-4"><Button type="submit" variant="success">Simpan Profil</Button><Button onClick={() => setFormData(null)} variant="secondary">Batal</Button></div>
            </form>
          </Card>
        ) : (
          <CardGrid data={visibleData} renderItem={renderCard} emptyMessage="Belum ada Profil Jemaat yang ditambahkan." customFilter={filterUI} />
        )}
      </div>
    );
  };

  const ProfilPendetaView = () => {
    const [formData, setFormData] = useState(null);
    const isAdmin = currentUser.role === 'Admin';
    
    // Urutkan profil agar profil pendeta yang sedang login berada di paling atas
    const visibleData = useMemo(() => {
      let data = [...profilPendeta];
      if (currentUser.role === 'Pendeta') {
         data.sort((a,b) => a.pendetaId === currentUser.id ? -1 : b.pendetaId === currentUser.id ? 1 : 0);
      }
      return data;
    }, [profilPendeta, currentUser]);

    const openForm = (item = null) => {
      if (item) setFormData(item);
      else setFormData({ pendetaId: isAdmin ? '' : currentUser.id, jabatan: '', tanggalMulai: '', fotoBase64: '' });
    };

    const submitForm = async (e) => {
      e.preventDefault();
      const success = await handleSave('profil_pendeta', formData, formData.id);
      if(success) setFormData(null);
    };

    const renderCard = (item) => {
      const pendeta = masterPendeta.find(p => p.id === item.pendetaId) || {};
      const isMyProfile = currentUser.id === item.pendetaId;
      const canEditThis = isAdmin || (currentUser.role === 'Pendeta' && isMyProfile);

      return (
        <div key={item.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow flex flex-col group ${isMyProfile ? 'border-indigo-400 shadow-indigo-100 ring-1 ring-indigo-200' : 'border-slate-200'}`}>
          <div className="p-6 flex-1 flex flex-col items-center text-center relative">
            {canEditThis && (
               <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                 <button onClick={() => openForm(item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={16} /></button>
                 {isAdmin && <button onClick={() => handleDelete('profil_pendeta', item.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>}
               </div>
            )}
            <div className="w-24 h-24 rounded-full bg-slate-100 overflow-hidden mb-4 border-4 border-white shadow-sm">
               {item.fotoBase64 ? <img src={item.fotoBase64} className="w-full h-full object-cover" alt="Profil" /> : <UserCircle className="w-full h-full text-slate-300" />}
            </div>
            <h3 className="font-bold text-lg text-slate-800 mb-1">{pendeta.name || 'Nama Tidak Diketahui'}</h3>
            {isMyProfile && <span className="text-xs text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full mb-2 border border-rose-100">Profil Anda</span>}
            <p className="text-sm font-semibold text-emerald-600 mb-4 bg-emerald-50 px-3 py-1 rounded-full">{item.jabatan}</p>
            <div className="w-full mt-auto bg-slate-50 p-3 rounded-xl border border-slate-100 text-left">
               <p className="text-xs text-slate-500 mb-0.5">Mulai Melayani di Klasis Mollo Barat:</p>
               <p className="text-sm font-semibold text-slate-700">{item.tanggalMulai ? new Date(item.tanggalMulai).toLocaleDateString('id-ID', {year: 'numeric', month: 'long', day: 'numeric'}) : '-'}</p>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">Profil Pendeta</h2>
          {!formData && (isAdmin || currentUser.role === 'Pendeta') && <Button onClick={() => openForm()}><Plus size={18} /> Tambah Profil</Button>}
        </div>

        {formData ? (
          <Card>
            <form onSubmit={submitForm} className="space-y-4 max-w-2xl">
              {isAdmin && <Select label="Pilih Pendeta" value={formData.pendetaId} onChange={e => setFormData({...formData, pendetaId: e.target.value})} options={masterPendeta.map(p => ({label: p.name, value: p.id}))} required />}
              <Input label="Jabatan Pelayanan" placeholder="Contoh: Ketua Majelis Jemaat" value={formData.jabatan} onChange={e => setFormData({...formData, jabatan: e.target.value})} required />
              <Input type="date" label="Tanggal mulai pelayanan di Klasis Mollo Barat" value={formData.tanggalMulai} onChange={e => setFormData({...formData, tanggalMulai: e.target.value})} required />
              <ImageUpload label="Foto Profil" currentImage={formData.fotoBase64} onImageSelected={(base64) => setFormData({...formData, fotoBase64: base64})} />
              <div className="flex gap-2 pt-4"><Button type="submit" variant="success">Simpan Profil</Button><Button onClick={() => setFormData(null)} variant="secondary">Batal</Button></div>
            </form>
          </Card>
        ) : (
          <CardGrid data={visibleData} renderItem={renderCard} emptyMessage="Belum ada Profil Pendeta yang ditambahkan." />
        )}
      </div>
    );
  };

  const LaporanPembaharuanView = () => {
    const [tabLaporan, setTabLaporan] = useState('jemaat');

    const laporanJemaat = masterJemaat.map(j => ({
      name: j.name, teritori: j.teritori, status: j.status,
      hasData: dataJemaat.some(d => d.jemaatId === j.id),
      hasProfil: profilJemaat.some(p => p.jemaatId === j.id)
    }));

    const laporanPendeta = masterPendeta.map(p => ({
      name: p.name, gender: p.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan',
      hasProfil: profilPendeta.some(pr => pr.pendetaId === p.id)
    }));

    const handlePrintLaporan = () => {
      const printWindow = window.open('', '', 'width=800,height=800');
      let tableContent = '';
      let title = '';

      if (tabLaporan === 'jemaat') {
        title = 'Status Input Data & Profil Jemaat';
        tableContent = `
          <table>
            <tr><th>Nama Jemaat</th><th>Status Data Realtime</th><th>Status Profil Realtime</th></tr>
            ${laporanJemaat.map(j => `<tr><td>${j.name}</td><td class="text-center">${j.hasData ? '✅ Sudah' : '❌ Belum'}</td><td class="text-center">${j.hasProfil ? '✅ Sudah' : '❌ Belum'}</td></tr>`).join('')}
          </table>`;
      } else {
        title = 'Status Input Profil Pendeta';
        tableContent = `
          <table>
            <tr><th>Nama Pendeta</th><th>Status Profil Realtime</th></tr>
            ${laporanPendeta.map(p => `<tr><td>${p.name}</td><td class="text-center">${p.hasProfil ? '✅ Sudah' : '❌ Belum'}</td></tr>`).join('')}
          </table>`;
      }

      printWindow.document.write(`
        <html><head><title>Laporan Pembaharuan Data</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 30px; font-size: 14px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f4f4f4; }
          .text-center { text-align: center; }
          h2, p { text-align: center; }
        </style></head><body>
        <h2>${title}</h2>
        <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
        ${tableContent}
        </body></html>
      `);
      printWindow.document.close();
      printWindow.setTimeout(() => { printWindow.print(); }, 500);
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">Laporan Pembaharuan</h2>
          <Button variant="secondary" onClick={handlePrintLaporan}><Printer size={18} /> Cetak Laporan {tabLaporan === 'jemaat' ? 'Jemaat' : 'Pendeta'}</Button>
        </div>

        <div className="flex border-b border-slate-200">
          <button className={`px-4 py-2 font-semibold ${tabLaporan === 'jemaat' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`} onClick={() => setTabLaporan('jemaat')}>Status Jemaat</button>
          <button className={`px-4 py-2 font-semibold ${tabLaporan === 'pendeta' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`} onClick={() => setTabLaporan('pendeta')}>Status Pendeta</button>
        </div>

        <Card className="p-0 overflow-hidden">
          <div className="overflow-y-auto max-h-[600px] p-5">
            <div className="space-y-3">
              {tabLaporan === 'jemaat' ? (
                laporanJemaat.map((j, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-semibold text-slate-800">{j.name}</p>
                      <p className="text-xs text-slate-500">{j.teritori} • {j.status}</p>
                    </div>
                    <div className="flex gap-4 text-sm font-medium">
                      <div className={`flex flex-col items-center ${j.hasData ? 'text-emerald-600' : 'text-rose-500'}`}>
                         {j.hasData ? <CheckCircle size={20} /> : <XCircle size={20} />} <span className="text-[10px] mt-1">Data</span>
                      </div>
                      <div className={`flex flex-col items-center ${j.hasProfil ? 'text-emerald-600' : 'text-rose-500'}`}>
                         {j.hasProfil ? <CheckCircle size={20} /> : <XCircle size={20} />} <span className="text-[10px] mt-1">Profil</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                laporanPendeta.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-semibold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.gender}</p>
                    </div>
                    <div className={`flex flex-col items-center text-sm font-medium ${p.hasProfil ? 'text-emerald-600' : 'text-rose-500'}`}>
                       {p.hasProfil ? <CheckCircle size={20} /> : <XCircle size={20} />} <span className="text-[10px] mt-1">Profil</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  };

  // --- MAIN RENDER ---
  if (!isFirebaseReady) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-pulse text-indigo-600 font-bold text-xl">Memuat Sistem...</div></div>;
  if (!currentUser) return <LoginView />;

  const menuItems = [
    { id: 'dashboard', label: 'Infografis Utama', icon: LayoutDashboard },
    { id: 'data_jemaat', label: 'Data Jemaat', icon: Users },
    { id: 'profil_jemaat', label: 'Profil Jemaat', icon: MapPin },
    { id: 'profil_pendeta', label: 'Profil Pendeta', icon: UserCircle },
    { id: 'laporan', label: 'Laporan Pembaharuan', icon: FileText }
  ];

  if (currentUser.role === 'Admin') {
    menuItems.push({ id: 'admin_settings', label: 'Manajemen Data', icon: Settings });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 text-white transition-all transform translate-y-0 ${toast.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}>
          {toast.type === 'error' ? <XCircle size={20} /> : <CheckCircle size={20} />}
          <span className="font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Sidebar Desktop */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 text-indigo-600">
            <img src="https://i.imgur.com/XV3hpOH.png" alt="Logo" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="font-bold text-lg tracking-tight leading-tight">Sistem Informasi<br/>Jemaat</h1>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Klasis Mollo Barat</p>
            </div>
          </div>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-1">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === item.id ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
              <item.icon size={20} className={activeTab === item.id ? 'text-indigo-600' : 'text-slate-400'} /> {item.label}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-slate-100">
          <div className="px-4 py-3 mb-2 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Login Sebagai</p>
            <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</p>
            <p className="text-xs text-indigo-600 font-medium">{currentUser.role}</p>
          </div>
          <button onClick={() => setCurrentUser(null)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-medium text-sm"><LogOut size={18} /> Keluar</button>
        </div>
      </aside>

      {/* Mobile Topbar & Pills */}
      <div className="md:hidden flex flex-col w-full z-40 relative">
        <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center">
           <div className="flex items-center gap-3 text-indigo-600">
             <img src="https://i.imgur.com/XV3hpOH.png" alt="Logo" className="w-8 h-8 object-contain" />
             <div>
                <h1 className="font-bold text-[15px] leading-tight">Sistem Informasi Jemaat</h1>
                <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Klasis Mollo Barat</p>
             </div>
           </div>
           <button onClick={() => setCurrentUser(null)} className="text-rose-600 p-2"><LogOut size={20}/></button>
        </div>
        <div className="bg-white px-4 pt-4 pb-2 border-b border-slate-200 flex overflow-x-auto gap-2 hide-scrollbar">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border ${activeTab === item.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>{item.label}</button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 w-full max-w-[1200px] mx-auto">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'data_jemaat' && <DataJemaatView />}
          {activeTab === 'profil_jemaat' && <ProfilJemaatView />}
          {activeTab === 'profil_pendeta' && <ProfilPendetaView />}
          {activeTab === 'laporan' && <LaporanPembaharuanView />}
          {activeTab === 'admin_settings' && currentUser.role === 'Admin' && <AdminSettingsView />}
        </div>
      </main>

    </div>
  );
}