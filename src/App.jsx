import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserCircle, Settings, LogOut, 
  LayoutDashboard, Plus, Edit2, Trash2, Search, 
  ChevronUp, ChevronDown, UploadCloud, Printer, CheckCircle, XCircle, FileText, MapPin, Save, Clock, FileSpreadsheet, Download, Image as ImageIcon, Map
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, addDoc
} from 'firebase/firestore';

// Konfigurasi Firebase (Mendukung Vercel env maupun environment lokal Immersive)
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyDFsVHv4CvEh20sLlKrQZjkUngqoXRhRXg",
      authDomain: "db-klasis-mollo-barat.firebaseapp.com",
      projectId: "db-klasis-mollo-barat",
      storageBucket: "db-klasis-mollo-barat.firebasestorage.app",
      messagingSenderId: "302184509523",
      appId: "1:302184509523:web:37cc91ee1ec8125d3316a6"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Pengaturan Jalur Database Produksi
const appId = typeof __app_id !== 'undefined' ? __app_id : 'klasis-mollo-barat';
const getCollectionPath = (colName) => `artifacts/${appId}/public/data/${colName}`;
const getDocRef = (colName, docId) => doc(db, 'artifacts', appId, 'public', 'data', colName, docId);

// Gambar Pengganti jika Foto Rusak/Kosong
const fallbackImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Crect width='100%25' height='100%25' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14px' font-weight='bold' fill='%2394a3b8'%3EGambar Tidak Tersedia%3C/text%3E%3C/svg%3E";

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

// Ekstrak Map - Diperbaiki untuk mengembalikan null jika bukan link embed
const extractIframeSrc = (text) => {
  if(!text) return '';
  const match = text.match(/src=["'](.*?)["']/);
  if (match) return match[1]; // Jika yang di paste tag iframe utuh
  if (text.startsWith('http') && text.includes('embed')) return text; // Jika yang di paste link valid embed
  return null; // Tidak valid
};

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 w-full ${className}`}>{children}</div>
);

const Button = ({ children, onClick, variant = 'primary', className = "", type = "button", disabled = false }) => {
  const baseStyle = "px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200",
    success: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-200",
    danger: "bg-rose-500 hover:bg-rose-600 text-white shadow-sm shadow-rose-200",
    secondary: "bg-white border border-slate-300 hover:bg-slate-50 text-slate-700",
    outline: "border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50"
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>{children}</button>;
};

const Input = ({ label, type = "text", value, onChange, placeholder, required = false, className="" }) => (
  <div className={`flex flex-col gap-1.5 w-full min-w-0 ${className}`}>
    {label && <label className="text-sm font-semibold text-slate-700 ml-1">{label} {required && <span className="text-rose-500">*</span>}</label>}
    <input type={type} value={value} onChange={onChange} required={required} placeholder={placeholder} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all shadow-sm" />
  </div>
);

const Select = ({ label, value, onChange, options, required = false, className="" }) => (
  <div className={`flex flex-col gap-1.5 w-full min-w-0 ${className}`}>
    {label && <label className="text-sm font-semibold text-slate-700 ml-1">{label} {required && <span className="text-rose-500">*</span>}</label>}
    <select value={value} onChange={onChange} required={required} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all shadow-sm">
      <option value="">Pilih...</option>
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

// Upload Gambar dengan Fitur Auto-Compressor
const ImageUpload = ({ label, onImageSelected, currentImage, required }) => {
  const [preview, setPreview] = useState(currentImage || null);
  const [error, setError] = useState("");

  useEffect(() => { setPreview(currentImage); }, [currentImage]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Auto Compress dengan HTML5 Canvas
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIMENSION = 800; // Maksimal resolusi aman
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Kompresi kualitas 70% agar ukurannya jauh di bawah 1MB
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setPreview(compressedBase64);
        onImageSelected(compressedBase64);
        setError("");
      };
      img.onerror = () => setError("Gagal membaca gambar. Format tidak didukung.");
      img.src = event.target.result;
    };
    reader.onerror = () => setError("Gagal memuat file.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {label && <label className="text-sm font-semibold text-slate-700 ml-1">{label} {required && <span className="text-rose-500">*</span>}</label>}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="h-32 w-32 rounded-2xl border-2 border-dashed border-slate-300 overflow-hidden bg-white flex items-center justify-center shrink-0 shadow-sm relative">
          {preview ? 
            <img src={preview} alt="Preview" className="h-full w-full object-cover" onError={(e) => {e.target.onerror = null; e.target.src = fallbackImage;}} /> : 
            <ImageIcon className="text-slate-300 h-10 w-10" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFileChange} className="hidden" id={`img-upload-${label}`} />
          <label htmlFor={`img-upload-${label}`} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl cursor-pointer hover:bg-indigo-700 transition-colors font-medium text-sm shadow-sm w-fit">
            <UploadCloud size={18} className="shrink-0" /> <span className="truncate">Pilih Foto</span>
          </label>
          <p className="text-xs text-slate-500 mt-2">Gambar akan otomatis diperkecil ukurannya oleh sistem agar proses simpan lancar.</p>
          {error && <p className="text-xs font-semibold text-rose-500 mt-2 bg-rose-50 p-2 rounded-lg">{error}</p>}
        </div>
      </div>
    </div>
  );
};

const CardGrid = ({ data, renderItem, itemsPerPage = 6, emptyMessage = "Tidak ada data", customFilter }) => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(item => Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase())));
  }, [data, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  
  useEffect(() => { 
    if (page > totalPages) setPage(1); 
  }, [filteredData, totalPages, page]);

  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="relative w-full sm:w-80 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" placeholder="Cari data..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
          />
        </div>
        <div className="w-full sm:w-auto flex-1 min-w-0">{customFilter}</div>
      </div>
      
      {paginatedData.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3">
          <Search className="text-slate-300 h-12 w-12" />
          <p className="text-slate-500 font-medium text-lg">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedData.map(renderItem)}
        </div>
      )}

      {/* Pagination Controls - Selalu Tampil */}
      {filteredData.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200 gap-4">
          <span className="text-sm font-medium text-slate-500 text-center sm:text-left">
            Menampilkan <span className="text-slate-800 font-bold">{(page-1)*itemsPerPage + 1}</span> - <span className="text-slate-800 font-bold">{Math.min(page*itemsPerPage, filteredData.length)}</span> dari <span className="text-slate-800 font-bold">{filteredData.length}</span> data
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="text-sm py-1.5 px-3">
              <ChevronUp className="rotate-[270deg]" size={16}/> Sebelumnya
            </Button>
            <div className="flex gap-1 px-2">
              {Array.from({length: totalPages}, (_, i) => i + 1).map(pageNum => (
                <button 
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center transition-all ${page === pageNum ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {pageNum}
                </button>
              ))}
            </div>
            <Button variant="secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="text-sm py-1.5 px-3">
              Selanjutnya <ChevronDown className="rotate-[270deg]" size={16}/>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

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

  const totalPages = pagination.limit === 'All' ? 1 : Math.ceil(sortedData.length / pagination.limit) || 1;

  useEffect(() => { 
    if (pagination.page > totalPages) setPagination(p => ({...p, page: 1})); 
  }, [sortedData, totalPages, pagination.page]);

  const paginatedData = useMemo(() => {
    if (pagination.limit === 'All') return sortedData;
    const startIndex = (pagination.page - 1) * pagination.limit;
    return sortedData.slice(startIndex, startIndex + pagination.limit);
  }, [sortedData, pagination]);

  const requestSort = (key) => setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc' });

  const handleNextPage = () => setPagination(p => ({ ...p, page: Math.min(totalPages, p.page + 1) }));
  const handlePrevPage = () => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }));

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col lg:flex-row justify-between gap-4 items-start lg:items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto flex-1">
          <div className="relative w-full sm:w-80 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Cari spesifik..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all min-w-0" />
          </div>
          <div className="w-full sm:w-auto min-w-0">{customFilter}</div>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-end">
          {customAction}
          {onDownloadExcel && <Button variant="secondary" onClick={onDownloadExcel} className="flex-1 sm:flex-none text-emerald-700 border-emerald-200 hover:bg-emerald-50"><Download size={18} /> Excel</Button>}
          {showPrint && <Button variant="secondary" onClick={() => {/* print handler here if needed */}} className="flex-1 sm:flex-none"><Printer size={18} /> Cetak</Button>}
          <Select value={pagination.limit} onChange={(e) => setPagination({ limit: e.target.value === 'All' ? 'All' : Number(e.target.value), page: 1 })}
            options={[{label: '10 Baris', value: 10}, {label: '25 Baris', value: 25}, {label: '50 Baris', value: 50}, {label: 'Semua', value: 'All'}]} className="w-full sm:w-36" />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden w-full max-w-full">
        <div className="overflow-x-auto w-full max-w-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-700 text-sm border-b border-slate-200">
                {columns.map(col => (
                  <th key={col.key} className="px-5 py-4 font-bold cursor-pointer hover:bg-slate-100 whitespace-nowrap transition-colors" onClick={() => requestSort(col.key)}>
                    <div className="flex items-center gap-2">{col.label}
                      {sortConfig.key === col.key ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-indigo-500" /> : <ChevronDown size={14} className="text-indigo-500" />) : <ChevronUp size={14} className="opacity-0" />}
                    </div>
                  </th>
                ))}
                {(onEdit || onDelete || onPrint) && <th className="px-5 py-4 font-bold text-right sticky right-0 bg-slate-50 border-l border-slate-100">Aksi</th>}
              </tr>
            </thead>
            <tbody className="text-sm text-slate-600">
              {paginatedData.length === 0 ? <tr><td colSpan={columns.length + 1} className="text-center py-12 text-slate-500 font-medium">Tidak ada data ditemukan</td></tr> :
                paginatedData.map((row, i) => (
                  <tr key={row.id || i} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors group">
                    {columns.map(col => <td key={col.key} className="px-5 py-3 whitespace-nowrap">{col.render ? col.render(row[col.key], row) : row[col.key] || '-'}</td>)}
                    {(onEdit || onDelete || onPrint) && (
                      <td className="px-5 py-3 flex gap-2 justify-end sticky right-0 bg-white group-hover:bg-indigo-50/30 border-l border-slate-100 transition-colors">
                        {onPrint && <button onClick={() => onPrint(row)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors" title="Cetak Form Lengkap"><Printer size={16} /></button>}
                        {onEdit && <button onClick={() => onEdit(row)} className="p-2 text-indigo-500 hover:bg-indigo-100 rounded-lg transition-colors" title="Edit Data"><Edit2 size={16} /></button>}
                        {onDelete && <button onClick={() => onDelete(row.id)} className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors" title="Hapus Data"><Trash2 size={16} /></button>}
                      </td>
                    )}
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        
        {/* Paginasi Footer - Selalu Tampil Walau 1 Halaman */}
        <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-t border-slate-200 bg-slate-50 gap-4 w-full">
          <span className="text-sm font-medium text-slate-500 text-center sm:text-left">
            Menampilkan <span className="text-slate-800 font-bold">{sortedData.length === 0 ? 0 : (pagination.limit === 'All' ? 1 : (pagination.page-1)*pagination.limit + 1)}</span> - <span className="text-slate-800 font-bold">{Math.min(pagination.page*pagination.limit, sortedData.length)}</span> dari <span className="text-slate-800 font-bold">{sortedData.length}</span> baris
          </span>
          <div className="flex gap-2 shrink-0">
            <Button variant="secondary" onClick={handlePrevPage} disabled={pagination.page <= 1} className="text-sm py-1.5">Sebelumnya</Button>
            <div className="flex items-center px-3 font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm">
              Hal {pagination.page} / {totalPages}
            </div>
            <Button variant="secondary" onClick={handleNextPage} disabled={pagination.page >= totalPages} className="text-sm py-1.5">Selanjutnya</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [fbUser, setFbUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState(null);

  const [masterJemaat, setMasterJemaat] = useState([]);
  const [masterPendeta, setMasterPendeta] = useState([]);
  const [dataJemaat, setDataJemaat] = useState([]);
  const [profilJemaat, setProfilJemaat] = useState([]);
  const [profilPendeta, setProfilPendeta] = useState([]);

  const [draftDataJemaat, setDraftDataJemaat] = useState(null);
  const [draftProfilJemaat, setDraftProfilJemaat] = useState(null);
  const [draftProfilPendeta, setDraftProfilPendeta] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    const initApp = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) { 
        console.error("Auth error:", error); 
      }
    };
    initApp();
    const unsubscribe = onAuthStateChanged(auth, setFbUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!fbUser) return;
    const subscribeToCol = (colName, setter) => onSnapshot(collection(db, getCollectionPath(colName)), (snapshot) => setter(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))), (err) => console.error(err));
    const unsubscribers = [
      subscribeToCol('master_jemaat', setMasterJemaat),
      subscribeToCol('master_pendeta', setMasterPendeta),
      subscribeToCol('data_jemaat', setDataJemaat),
      subscribeToCol('profil_jemaat', setProfilJemaat),
      subscribeToCol('profil_pendeta', setProfilPendeta)
    ];
    return () => unsubscribers.forEach(unsub => unsub());
  }, [fbUser]);

  const handleSave = async (colName, data, id = null) => {
    if (!fbUser) return false;
    try {
      if (id) await setDoc(getDocRef(colName, id), data, { merge: true });
      else await addDoc(collection(db, getCollectionPath(colName)), data);
      showToast('Data berhasil disimpan');
      return true;
    } catch (e) { showToast('Gagal menyimpan data. Coba perkecil ukuran foto.', 'error'); return false; }
  };

  const handleDelete = async (colName, id) => {
    if(!fbUser) return;
    if(!window.confirm("Yakin ingin menghapus data ini secara permanen?")) return;
    try { await deleteDoc(getDocRef(colName, id)); showToast('Data berhasil dihapus'); } 
    catch (e) { showToast('Gagal menghapus data', 'error'); }
  };

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
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
        <Card className="w-full max-w-md shadow-xl border-0 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
          <div className="text-center mb-8 mt-4">
            <div className="inline-flex bg-white p-4 rounded-full shadow-sm border border-slate-100 mb-4">
              <img src="https://i.imgur.com/XV3hpOH.png" alt="Logo" className="w-24 h-24 object-contain" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 leading-tight">Sistem Informasi Jemaat</h1>
            <p className="text-indigo-600 font-bold mt-1 uppercase tracking-widest text-xs">Klasis Mollo Barat</p>
          </div>
          
          {loginError && (
             <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl mb-6 text-sm font-semibold flex items-center gap-2">
                <XCircle size={18} className="shrink-0"/>
                <span>{loginError}</span>
             </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5 w-full">
            <Select label="Masuk Sebagai" value={role} onChange={(e) => { setRole(e.target.value); setUsername(''); setPassword(''); setLoginTeritori(''); setLoginError(''); }}
              options={[{label: 'Admin Klasis', value: 'Admin'}, {label: 'Jemaat (Gereja)', value: 'Jemaat'}, {label: 'Pendeta', value: 'Pendeta'}]} required />
            
            {role === 'Jemaat' && (
              <Select label="Filter Teritori (Opsional)" value={loginTeritori} onChange={(e) => { setLoginTeritori(e.target.value); setUsername(''); setLoginError(''); }}
                options={[{label: 'Selatan', value: 'Selatan'}, {label: 'Tengah', value: 'Tengah'}, {label: 'Barat', value: 'Barat'}]} />
            )}

            {role === 'Admin' ? <Input label="Username" value={username} onChange={(e)=>{setUsername(e.target.value); setLoginError('');}} required /> :
             role === 'Jemaat' ? <Select label="Pilih Nama Jemaat" value={username} onChange={(e)=>{setUsername(e.target.value); setLoginError('');}} options={jemaatOptions} required /> :
             <Select label="Pilih Nama Pendeta" value={username} onChange={(e)=>{setUsername(e.target.value); setLoginError('');}} options={masterPendeta.map(item => ({label: item.name, value: item.id}))} required />
            }
            <Input label="Password" type="password" value={password} onChange={(e)=>{setPassword(e.target.value); setLoginError('');}} required />
            <Button type="submit" className="w-full mt-8 py-3.5 text-lg font-bold">Masuk ke Sistem</Button>
          </form>
        </Card>
      </div>
    );
  };

  const DashboardView = () => {
    const [now, setNow] = useState(new Date());
    
    useEffect(() => {
      const timer = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(timer);
    }, []);

    const totalKK = dataJemaat.reduce((acc, curr) => acc + (Number(curr.jumlahKK) || 0), 0);
    const jiwaL = dataJemaat.reduce((acc, curr) => acc + (Number(curr.jiwaL) || 0), 0);
    const jiwaP = dataJemaat.reduce((acc, curr) => acc + (Number(curr.jiwaP) || 0), 0);
    const totalJiwa = jiwaL + jiwaP;

    const totalJemaat = masterJemaat.filter(j => j.status === 'Jemaat').length;
    const totalMataJemaat = masterJemaat.filter(j => j.status === 'Jemaat Bermata Jemaat').length;
    const totalPosPelayanan = masterJemaat.filter(j => j.status === 'Pos Pelayanan').length;
    
    const pendetaL = masterPendeta.filter(p => p.jenisKelamin === 'L').length;
    const pendetaP = masterPendeta.filter(p => p.jenisKelamin === 'P').length;
    const totalPendeta = masterPendeta.length;

    const StatCard = ({ title, value, colorClass }) => (
      <Card className="flex items-center gap-4 p-5 hover:shadow-md transition-shadow">
        <div className={`w-3 h-14 rounded-full shrink-0 ${colorClass}`}></div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500 mb-0.5 truncate">{title}</p>
          <p className="text-3xl font-black text-slate-800">{value}</p>
        </div>
      </Card>
    );

    return (
      <div className="space-y-8 w-full">
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="min-w-0">
             <h2 className="text-3xl font-black text-slate-800 truncate tracking-tight">Shalom, {currentUser.name}!</h2>
             <p className="text-slate-500 text-lg mt-1 font-medium">Selamat datang di Infografis Klasis Realtime</p>
          </div>
          <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3 w-full md:w-fit shrink-0">
             <Clock className="text-indigo-600 shrink-0" size={28} />
             <div className="min-w-0">
               <p className="text-xs text-slate-500 font-bold uppercase tracking-widest truncate">{now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
               <p className="text-xl font-black text-slate-800 leading-none mt-1 truncate">{now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</p>
             </div>
          </div>
        </div>
        
        <div>
          <h3 className="font-bold text-xl text-slate-800 mb-4 flex items-center gap-2"><Users size={24} className="text-indigo-600 shrink-0"/> Populasi Jemaat</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard title="Jumlah KK" value={totalKK} colorClass="bg-emerald-500" />
            <StatCard title="Jiwa Laki-laki" value={jiwaL} colorClass="bg-blue-500" />
            <StatCard title="Jiwa Perempuan" value={jiwaP} colorClass="bg-pink-500" />
            <StatCard title="Total Jiwa" value={totalJiwa} colorClass="bg-amber-500" />
          </div>
        </div>

        <div>
          <h3 className="font-bold text-xl text-slate-800 mb-4 flex items-center gap-2 mt-4"><MapPin size={24} className="text-indigo-600 shrink-0"/> Status Jemaat</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            <StatCard title="Jemaat (Mandiri)" value={totalJemaat} colorClass="bg-indigo-500" />
            <StatCard title="Bermata Jemaat" value={totalMataJemaat} colorClass="bg-purple-500" />
            <StatCard title="Pos Pelayanan" value={totalPosPelayanan} colorClass="bg-sky-500" />
          </div>
        </div>

        <div>
          <h3 className="font-bold text-xl text-slate-800 mb-4 flex items-center gap-2 mt-4"><UserCircle size={24} className="text-indigo-600 shrink-0"/> Pelayan (Pendeta)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            <StatCard title="Pendeta Laki-laki" value={pendetaL} colorClass="bg-blue-600" />
            <StatCard title="Pendeta Perempuan" value={pendetaP} colorClass="bg-pink-600" />
            <StatCard title="Total Pendeta" value={totalPendeta} colorClass="bg-slate-700" />
          </div>
        </div>
      </div>
    );
  };

  const AdminSettingsView = () => {
    const [tab, setTab] = useState('jemaat');
    const [localJemaat, setLocalJemaat] = useState([]);
    const [localPendeta, setLocalPendeta] = useState([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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
      if(!text.includes('\t') && !text.includes('\n')) return; 
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
      <div className="space-y-6 w-full max-w-full">
        <datalist id="teritori-list"><option value="Selatan"/><option value="Tengah"/><option value="Barat"/></datalist>
        <datalist id="status-list"><option value="Jemaat"/><option value="Jemaat Bermata Jemaat"/><option value="Pos Pelayanan"/></datalist>
        <datalist id="gender-list"><option value="L"/><option value="P"/></datalist>

        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-slate-800">Manajemen Master Data</h2>
            <p className="text-sm text-slate-500 font-medium mt-1 truncate">Klik sel tabel, lalu <strong>Paste dari Excel</strong> untuk isi cepat.</p>
          </div>
          <Button onClick={handleSaveAll} variant="success" disabled={!hasChanges || isSaving} className="px-8 py-3 w-full lg:w-auto text-lg shadow-emerald-200 shrink-0">
            <Save size={20} /> {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button className={`px-6 py-3 font-bold rounded-t-2xl transition-all flex-1 sm:flex-none ${tab === 'jemaat' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`} onClick={() => setTab('jemaat')}>Master Jemaat</button>
          <button className={`px-6 py-3 font-bold rounded-t-2xl transition-all flex-1 sm:flex-none ${tab === 'pendeta' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`} onClick={() => setTab('pendeta')}>Master Pendeta</button>
        </div>

        <div className="bg-white rounded-b-2xl rounded-tr-2xl shadow-sm border border-slate-200 overflow-hidden -mt-1 relative z-10 w-full max-w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-sm border-b border-slate-300">
                  {tab === 'jemaat' ? (
                    <>
                      <th className="px-4 py-4 font-bold border-r border-slate-200 w-1/3 min-w-[250px]">Nama Jemaat</th>
                      <th className="px-4 py-4 font-bold border-r border-slate-200 min-w-[150px]">Teritori</th>
                      <th className="px-4 py-4 font-bold border-r border-slate-200 min-w-[200px]">Status</th>
                      <th className="px-4 py-4 font-bold border-r border-slate-200 min-w-[150px]">Password Akses</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-4 font-bold border-r border-slate-200 w-1/2 min-w-[250px]">Nama Pendeta</th>
                      <th className="px-4 py-4 font-bold border-r border-slate-200 min-w-[150px]">Gender (L/P)</th>
                      <th className="px-4 py-4 font-bold border-r border-slate-200 min-w-[150px]">Password Akses</th>
                    </>
                  )}
                  <th className="px-4 py-4 font-bold text-center w-16">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {(tab === 'jemaat' ? localJemaat : localPendeta).map((row, idx) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-indigo-50/50 transition-colors group">
                    {tab === 'jemaat' ? (
                      <>
                        <td className="p-0 border-r border-slate-100">
                          <input type="text" value={row.name||''} onChange={e=>handleChange('jemaat', row.id, 'name', e.target.value)} onPaste={e=>handlePaste(e, 'jemaat', idx)} className="w-full px-4 py-3 bg-transparent outline-none focus:bg-white focus:ring-inset focus:ring-2 focus:ring-indigo-400" placeholder="Ketik nama jemaat..." />
                        </td>
                        <td className="p-0 border-r border-slate-100">
                          <input type="text" list="teritori-list" value={row.teritori||''} onChange={e=>handleChange('jemaat', row.id, 'teritori', e.target.value)} onPaste={e=>handlePaste(e, 'jemaat', idx)} className="w-full px-4 py-3 bg-transparent outline-none focus:bg-white focus:ring-inset focus:ring-2 focus:ring-indigo-400" placeholder="Selatan/Tengah/Barat" />
                        </td>
                        <td className="p-0 border-r border-slate-100">
                          <input type="text" list="status-list" value={row.status||''} onChange={e=>handleChange('jemaat', row.id, 'status', e.target.value)} onPaste={e=>handlePaste(e, 'jemaat', idx)} className="w-full px-4 py-3 bg-transparent outline-none focus:bg-white focus:ring-inset focus:ring-2 focus:ring-indigo-400" placeholder="Jemaat / Pos..." />
                        </td>
                        <td className="p-0 border-r border-slate-100">
                          <input type="text" value={row.password||''} onChange={e=>handleChange('jemaat', row.id, 'password', e.target.value)} onPaste={e=>handlePaste(e, 'jemaat', idx)} className="w-full px-4 py-3 bg-transparent outline-none focus:bg-white focus:ring-inset focus:ring-2 focus:ring-indigo-400 font-mono text-slate-600" placeholder="********" />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-0 border-r border-slate-100">
                          <input type="text" value={row.name||''} onChange={e=>handleChange('pendeta', row.id, 'name', e.target.value)} onPaste={e=>handlePaste(e, 'pendeta', idx)} className="w-full px-4 py-3 bg-transparent outline-none focus:bg-white focus:ring-inset focus:ring-2 focus:ring-indigo-400" placeholder="Ketik nama pendeta..." />
                        </td>
                        <td className="p-0 border-r border-slate-100">
                          <input type="text" list="gender-list" value={row.jenisKelamin||''} onChange={e=>handleChange('pendeta', row.id, 'jenisKelamin', e.target.value)} onPaste={e=>handlePaste(e, 'pendeta', idx)} className="w-full px-4 py-3 bg-transparent outline-none focus:bg-white focus:ring-inset focus:ring-2 focus:ring-indigo-400" placeholder="L / P" />
                        </td>
                        <td className="p-0 border-r border-slate-100">
                          <input type="text" value={row.password||''} onChange={e=>handleChange('pendeta', row.id, 'password', e.target.value)} onPaste={e=>handlePaste(e, 'pendeta', idx)} className="w-full px-4 py-3 bg-transparent outline-none focus:bg-white focus:ring-inset focus:ring-2 focus:ring-indigo-400 font-mono text-slate-600" placeholder="********" />
                        </td>
                      </>
                    )}
                    <td className="p-2 text-center">
                      <button onClick={() => handleDeleteRow(row.id, row.isNew, tab)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-200">
            <button onClick={() => {
              setHasChanges(true);
              if(tab === 'jemaat') setLocalJemaat(p => [...p, {id: `new-${crypto.randomUUID()}`, isNew: true, name:'', teritori:'', status:'', password:''}]);
              else setLocalPendeta(p => [...p, {id: `new-${crypto.randomUUID()}`, isNew: true, name:'', jenisKelamin:'', password:''}]);
            }} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-2 w-full py-2 bg-indigo-50/50 hover:bg-indigo-100 rounded-xl transition-colors"><Plus size={18}/> Tambah Baris Kosong Baru</button>
          </div>
        </div>
      </div>
    );
  };

  const DataJemaatView = () => {
    const [filterTeritori, setFilterTeritori] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);
    const [importText, setImportText] = useState('');
    
    const isAdmin = currentUser.role === 'Admin';
    const isJemaat = currentUser.role === 'Jemaat';

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
      if (item) setDraftDataJemaat(item);
      else setDraftDataJemaat(generateDefaultDataJemaat(isAdmin ? '' : currentUser.id));
    };

    const submitForm = async (e) => {
      e.preventDefault();
      const success = await handleSave('data_jemaat', draftDataJemaat, draftDataJemaat.id);
      if(success) setDraftDataJemaat(null);
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
      showToast(`Berhasil mengimport ${successCount} baris data jemaat`);
      setShowImportModal(false);
      setImportText('');
    };

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

    const handleDownloadExcel = () => {
      let csvContent = '\uFEFF'; 
      
      const headers = printCols.map(c => `"${c.label}"`).join(',');
      csvContent += headers + '\n';
      
      visibleData.forEach(row => {
         const rowData = printCols.map(col => {
            let val = col.render ? col.render(row[col.key], row) : row[col.key];
            if (val === undefined || val === null) val = '';
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
      <select value={filterTeritori} onChange={(e) => setFilterTeritori(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white shadow-sm outline-none w-full font-medium text-slate-700 min-w-0">
        <option value="">🗺️ Semua Teritori</option>
        <option value="Selatan">📍 Teritori Selatan</option>
        <option value="Tengah">📍 Teritori Tengah</option>
        <option value="Barat">📍 Teritori Barat</option>
      </select>
    );

    return (
      <div className="space-y-6 w-full max-w-full">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 w-full">
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-slate-800">Database Jemaat</h2>
            <p className="text-slate-500 font-medium truncate">Kelola dan lihat rincian data seluruh jemaat.</p>
          </div>
          {!draftDataJemaat && (isAdmin || isJemaat) && <Button onClick={() => openForm()} className="w-full sm:w-auto py-3 px-6 shadow-indigo-200 text-lg shrink-0"><Plus size={20} /> Input Data Baru</Button>}
        </div>

        {draftDataJemaat ? (
          <Card className="shadow-lg border-0 ring-1 ring-slate-200">
            <h3 className="text-2xl font-black mb-6 pb-4 border-b border-slate-100 text-slate-800">{draftDataJemaat.id ? 'Edit' : 'Input'} Data Lengkap Jemaat</h3>
            <form onSubmit={submitForm} className="space-y-8 w-full">
              {isAdmin && <div className="max-w-md bg-indigo-50 p-4 rounded-2xl border border-indigo-100 mb-6"><Select label="Pilih Jemaat yang akan diinput" value={draftDataJemaat.jemaatId} onChange={e => setDraftDataJemaat({...draftDataJemaat, jemaatId: e.target.value})} options={masterJemaat.map(j => ({label: j.name, value: j.id}))} required /></div>}
              
              <div className="space-y-6 w-full">
                {Object.entries(formDataJemaatGroups).map(([groupName, fields]) => (
                  <div key={groupName} className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm w-full">
                    <h4 className="font-black text-lg text-indigo-900 mb-5 flex items-center gap-3"><div className="w-2 h-6 bg-indigo-500 rounded-full"></div>{groupName}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                      {fields.map(label => {
                        const key = toCamelCase(label);
                        return (
                          <Input key={key} type="number" label={label} value={draftDataJemaat[key] || 0} onChange={e => setDraftDataJemaat({...draftDataJemaat, [key]: Number(e.target.value)})} />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-200 mt-8">
                <Button type="submit" variant="success" className="px-10 py-3.5 text-lg w-full sm:w-auto font-bold shadow-emerald-200">Simpan Data Jemaat</Button>
                <Button onClick={() => setDraftDataJemaat(null)} variant="secondary" className="px-10 py-3.5 text-lg w-full sm:w-auto font-bold">Batal & Kembali</Button>
              </div>
            </form>
          </Card>
        ) : (
          <div className="w-full">
            {currentUser.role === 'Pendeta' && <p className="text-amber-700 mb-4 bg-amber-50 p-4 rounded-2xl border border-amber-200 font-medium">Sebagai Pendeta, Anda hanya dapat melihat rekapitulasi data. Hubungi Jemaat terkait untuk perubahan data.</p>}
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
          </div>
        )}

        {/* Modal Import */}
        {showImportModal && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-2xl font-black flex items-center gap-3 text-slate-800"><FileSpreadsheet className="text-emerald-500" size={28} /> Import Data dari Excel</h3>
                 <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-rose-500 bg-slate-100 hover:bg-rose-50 p-2 rounded-full transition-colors"><XCircle size={24} /></button>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl mb-6 text-sm text-blue-800 leading-relaxed">
                <p className="font-bold mb-1">Cara Import Cepat:</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Buka file Excel Anda.</li>
                  <li>Blok/sorot tabel data <strong>mulai dari baris Judul Kolom (Header)</strong> hingga baris data terakhir di bawahnya. Pastikan ada kolom bernama <b>Nama</b>.</li>
                  <li>Tekan <b>Copy (Ctrl+C)</b> di Excel.</li>
                  <li>Klik kotak teks di bawah ini, lalu tekan <b>Paste (Ctrl+V)</b>. Sistem akan otomatis memetakan data.</li>
                </ol>
              </div>
              <textarea 
                className="w-full h-64 border-2 border-dashed border-slate-300 rounded-2xl p-4 text-sm font-mono whitespace-pre bg-slate-50 focus:bg-white outline-none focus:border-emerald-500 transition-colors resize-none"
                placeholder="Klik di sini, lalu tekan Ctrl+V (atau Cmd+V) untuk paste tabel Excel..."
                value={importText}
                onChange={e => setImportText(e.target.value)}
              ></textarea>
              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                <Button variant="secondary" className="py-3" onClick={() => setShowImportModal(false)}>Batal</Button>
                <Button variant="success" className="py-3 px-8 text-lg" onClick={handleImportCSV}>Mulai Import ke Database</Button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  };

  const ProfilJemaatView = () => {
    const [filterTeritori, setFilterTeritori] = useState('');
    const isAdmin = currentUser.role === 'Admin';
    
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
      if (item) setDraftProfilJemaat(item);
      else setDraftProfilJemaat({ jemaatId: isAdmin ? '' : currentUser.id, sejarah: '', waktuKebaktian: '', linkMap: '', fotoBase64: '' });
    };

    const submitForm = async (e) => {
      e.preventDefault();
      const success = await handleSave('profil_jemaat', draftProfilJemaat, draftProfilJemaat.id);
      if(success) setDraftProfilJemaat(null);
    };

    const filterUI = (
      <select value={filterTeritori} onChange={(e) => setFilterTeritori(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white shadow-sm outline-none w-full font-medium text-slate-700 min-w-0">
        <option value="">🗺️ Semua Teritori</option>
        <option value="Selatan">📍 Teritori Selatan</option>
        <option value="Tengah">📍 Teritori Tengah</option>
        <option value="Barat">📍 Teritori Barat</option>
      </select>
    );

    const renderCard = (item) => {
      const jemaat = masterJemaat.find(j => j.id === item.jemaatId) || {};
      const isMyProfile = currentUser.id === item.jemaatId;
      const canEditThis = isAdmin || (currentUser.role === 'Jemaat' && isMyProfile);

      return (
        <div key={item.id} className={`bg-white rounded-3xl shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group ${isMyProfile ? 'border-2 border-indigo-400 ring-4 ring-indigo-50' : 'border border-slate-200'}`}>
          <div className="h-48 bg-slate-100 relative overflow-hidden">
            {item.fotoBase64 ? 
              <img src={item.fotoBase64} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Gereja" onError={(e) => {e.target.onerror = null; e.target.src = fallbackImage;}} /> : 
              <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-200/50"><ImageIcon size={48} className="mb-2 opacity-20" /><span className="text-xs font-bold uppercase tracking-widest opacity-50">Belum ada foto</span></div>
            }
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            {canEditThis && (
               <div className="absolute top-3 right-3 flex gap-2">
                 <button onClick={() => openForm(item)} className="p-2.5 bg-white/90 text-indigo-600 hover:bg-white rounded-xl shadow-lg backdrop-blur-sm transition-all"><Edit2 size={18} /></button>
                 {isAdmin && <button onClick={() => handleDelete('profil_jemaat', item.id)} className="p-2.5 bg-white/90 text-rose-600 hover:bg-white rounded-xl shadow-lg backdrop-blur-sm transition-all"><Trash2 size={18} /></button>}
               </div>
            )}
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="font-black text-2xl text-white leading-tight drop-shadow-md">{jemaat.name || 'Nama Tidak Diketahui'}</h3>
              <p className="text-sm font-semibold text-indigo-200 drop-shadow-md mt-1">{jemaat.status || 'Status Tidak Diketahui'}</p>
            </div>
          </div>
          <div className="p-5 flex-1 flex flex-col">
            {isMyProfile && <div className="mb-4"><span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">⭐ Profil Gereja Anda</span></div>}
            
            <div className="flex items-start gap-3 text-slate-700 text-sm mb-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <Clock size={20} className="shrink-0 mt-0.5 text-indigo-500" /> 
              <div className="min-w-0">
                <p className="font-bold text-indigo-900 mb-0.5 text-xs uppercase tracking-wider">Jadwal Ibadah</p>
                <p className="font-medium whitespace-pre-wrap">{item.waktuKebaktian || 'Belum diatur'}</p>
              </div>
            </div>

            {/* Pengecekan Iframe Lebih Aman */}
            {item.linkMap && item.linkMap.includes('embed') ? (
               <div className="w-full aspect-video bg-slate-100 rounded-2xl overflow-hidden mb-4 border border-slate-200 relative group/map">
                 <iframe src={item.linkMap} className="w-full h-full border-0 absolute inset-0" allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
               </div>
            ) : item.linkMap ? (
               <div className="w-full aspect-video bg-rose-50 rounded-2xl flex flex-col items-center justify-center mb-4 border border-rose-200 text-rose-500 p-4 text-center">
                  <Map size={32} className="mb-2 opacity-50"/>
                  <span className="text-sm font-semibold">Lokasi peta tidak valid.</span>
                  <span className="text-xs mt-1 opacity-80">Edit form dan gunakan link dari menu "Sematkan Peta" di Google Maps.</span>
               </div>
            ) : null}
            
            <div className="mt-auto pt-4 border-t border-slate-100">
              <p className="font-bold text-slate-800 text-sm mb-1">Sejarah Singkat:</p>
              <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">{item.sejarah}</p>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6 w-full max-w-full">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-slate-800">Profil Jemaat & Gedung</h2>
            <p className="text-slate-500 font-medium truncate">Informasi jadwal ibadah, lokasi, dan sejarah.</p>
          </div>
          {!draftProfilJemaat && (isAdmin || currentUser.role === 'Jemaat') && <Button onClick={() => openForm()} className="w-full sm:w-auto py-3 px-6 text-lg shrink-0"><Plus size={20} /> Input Profil Jemaat</Button>}
        </div>

        {draftProfilJemaat ? (
          <Card className="shadow-lg border-0 ring-1 ring-slate-200 max-w-3xl mx-auto w-full">
            <h3 className="text-2xl font-black mb-6 pb-4 border-b border-slate-100 text-slate-800">Lengkapi Profil Jemaat</h3>
            <form onSubmit={submitForm} className="space-y-6 w-full">
              {isAdmin && <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100"><Select label="Pilih Jemaat yang akan diisi profilnya" value={draftProfilJemaat.jemaatId} onChange={e => setDraftProfilJemaat({...draftProfilJemaat, jemaatId: e.target.value})} options={masterJemaat.map(j => ({label: j.name, value: j.id}))} required /></div>}
              
              <ImageUpload label="Foto Gedung Gereja / Jemaat" currentImage={draftProfilJemaat.fotoBase64} onImageSelected={(base64) => setDraftProfilJemaat({...draftProfilJemaat, fotoBase64: base64})} />
              
              <div className="grid grid-cols-1 gap-6 pt-4 border-t border-slate-100">
                <Input label="Waktu Kebaktian" placeholder="Contoh: Minggu, Pkl 08.00 & 16.00" value={draftProfilJemaat.waktuKebaktian} onChange={e => setDraftProfilJemaat({...draftProfilJemaat, waktuKebaktian: e.target.value})} required />
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 w-full min-w-0">
                  <Input label="Sematkan Lokasi (Google Maps)" placeholder='Paste url embed / kode iframe "src"' value={draftProfilJemaat.linkMap} onChange={e => {
                      const val = e.target.value;
                      if (!val) { setDraftProfilJemaat({...draftProfilJemaat, linkMap: ''}); return; }
                      const extracted = extractIframeSrc(val);
                      setDraftProfilJemaat({...draftProfilJemaat, linkMap: extracted !== null ? extracted : val});
                  }} />
                  <p className="text-xs text-slate-500 mt-3 font-medium flex gap-2 items-start"><Map size={16} className="shrink-0 text-indigo-500"/> <span>Cara: Buka Google Maps - Pilih Lokasi - Klik Bagikan - Pilih <b>Sematkan Peta</b> - Klik Salin HTML, lalu paste di kotak di atas.</span></p>
                </div>
                <div className="flex flex-col gap-1.5 w-full min-w-0">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Sejarah Singkat Jemaat <span className="text-rose-500">*</span></label>
                  <textarea rows={6} className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all shadow-sm resize-y" placeholder="Ceritakan sejarah berdirinya jemaat..." value={draftProfilJemaat.sejarah} onChange={e => setDraftProfilJemaat({...draftProfilJemaat, sejarah: e.target.value})} required></textarea>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-200 mt-6">
                <Button type="submit" variant="success" className="px-10 py-3.5 text-lg w-full sm:w-auto font-bold shadow-emerald-200">Simpan Profil Jemaat</Button>
                <Button onClick={() => setDraftProfilJemaat(null)} variant="secondary" className="px-10 py-3.5 text-lg w-full sm:w-auto font-bold">Batal & Kembali</Button>
              </div>
            </form>
          </Card>
        ) : (
          <CardGrid data={visibleData} renderItem={renderCard} emptyMessage="Belum ada Profil Jemaat yang ditambahkan ke sistem." customFilter={filterUI} />
        )}
      </div>
    );
  };

  const ProfilPendetaView = () => {
    const isAdmin = currentUser.role === 'Admin';
    
    const visibleData = useMemo(() => {
      let data = [...profilPendeta];
      if (currentUser.role === 'Pendeta') {
         data.sort((a,b) => a.pendetaId === currentUser.id ? -1 : b.pendetaId === currentUser.id ? 1 : 0);
      }
      return data;
    }, [profilPendeta, currentUser]);

    const openForm = (item = null) => {
      if (item) setDraftProfilPendeta(item);
      else setDraftProfilPendeta({ pendetaId: isAdmin ? '' : currentUser.id, jabatan: '', tanggalMulai: '', fotoBase64: '' });
    };

    const submitForm = async (e) => {
      e.preventDefault();
      const success = await handleSave('profil_pendeta', draftProfilPendeta, draftProfilPendeta.id);
      if(success) setDraftProfilPendeta(null);
    };

    const renderCard = (item) => {
      const pendeta = masterPendeta.find(p => p.id === item.pendetaId) || {};
      const isMyProfile = currentUser.id === item.pendetaId;
      const canEditThis = isAdmin || (currentUser.role === 'Pendeta' && isMyProfile);

      return (
        <div key={item.id} className={`bg-white rounded-3xl shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group relative ${isMyProfile ? 'border-2 border-indigo-400 ring-4 ring-indigo-50' : 'border border-slate-200'}`}>
          <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
          
          {canEditThis && (
             <div className="absolute top-3 right-3 flex gap-2">
               <button onClick={() => openForm(item)} className="p-2 bg-white/20 text-white hover:bg-white hover:text-indigo-600 rounded-xl backdrop-blur-md transition-all"><Edit2 size={16} /></button>
               {isAdmin && <button onClick={() => handleDelete('profil_pendeta', item.id)} className="p-2 bg-white/20 text-white hover:bg-white hover:text-rose-600 rounded-xl backdrop-blur-md transition-all"><Trash2 size={16} /></button>}
             </div>
          )}

          <div className="px-6 pb-6 flex-1 flex flex-col items-center text-center -mt-12 relative z-10">
            <div className="w-28 h-28 rounded-full bg-white overflow-hidden mb-4 border-4 border-white shadow-md">
               {item.fotoBase64 ? 
                 <img src={item.fotoBase64} className="w-full h-full object-cover" alt="Profil" onError={(e) => {e.target.onerror = null; e.target.src = fallbackImage;}} /> : 
                 <UserCircle className="w-full h-full text-slate-200" />
               }
            </div>
            {isMyProfile && <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full mb-3 border border-rose-200 shadow-sm absolute top-14">Profil Anda</span>}
            <h3 className="font-black text-xl text-slate-800 mb-1 px-2">{pendeta.name || 'Nama Tidak Diketahui'}</h3>
            <p className="text-sm font-bold text-indigo-600 mb-5 bg-indigo-50 px-4 py-1.5 rounded-full">{item.jabatan}</p>
            
            <div className="w-full mt-auto bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left flex items-start gap-3">
               <Clock className="text-slate-400 shrink-0 mt-0.5" size={18} />
               <div>
                 <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Mulai Melayani (Klasis):</p>
                 <p className="text-sm font-bold text-slate-800">{item.tanggalMulai ? new Date(item.tanggalMulai).toLocaleDateString('id-ID', {year: 'numeric', month: 'long', day: 'numeric'}) : '-'}</p>
               </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6 w-full max-w-full">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-slate-800">Profil Pelayan (Pendeta)</h2>
            <p className="text-slate-500 font-medium truncate">Informasi profil dan masa pelayanan para pendeta.</p>
          </div>
          {!draftProfilPendeta && (isAdmin || currentUser.role === 'Pendeta') && <Button onClick={() => openForm()} className="w-full sm:w-auto py-3 px-6 text-lg shrink-0"><Plus size={20} /> Input Profil Baru</Button>}
        </div>

        {draftProfilPendeta ? (
          <Card className="shadow-lg border-0 ring-1 ring-slate-200 max-w-2xl mx-auto w-full">
            <h3 className="text-2xl font-black mb-6 pb-4 border-b border-slate-100 text-slate-800">Lengkapi Profil Pendeta</h3>
            <form onSubmit={submitForm} className="space-y-6 w-full">
              {isAdmin && <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100"><Select label="Pilih Pendeta" value={draftProfilPendeta.pendetaId} onChange={e => setDraftProfilPendeta({...draftProfilPendeta, pendetaId: e.target.value})} options={masterPendeta.map(p => ({label: p.name, value: p.id}))} required /></div>}
              
              <ImageUpload label="Pas Foto Profil" currentImage={draftProfilPendeta.fotoBase64} onImageSelected={(base64) => setDraftProfilPendeta({...draftProfilPendeta, fotoBase64: base64})} />
              
              <div className="grid gap-6 pt-4 border-t border-slate-100">
                <Input label="Jabatan Pelayanan saat ini" placeholder="Contoh: Ketua Majelis Jemaat" value={draftProfilPendeta.jabatan} onChange={e => setDraftProfilPendeta({...draftProfilPendeta, jabatan: e.target.value})} required />
                <Input type="date" label="Tanggal Mulai Pelayanan di Klasis Mollo Barat" value={draftProfilPendeta.tanggalMulai} onChange={e => setDraftProfilPendeta({...draftProfilPendeta, tanggalMulai: e.target.value})} required className="max-w-[300px]" />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-200 mt-6">
                <Button type="submit" variant="success" className="px-10 py-3.5 text-lg w-full sm:w-auto font-bold shadow-emerald-200">Simpan Profil</Button>
                <Button onClick={() => setDraftProfilPendeta(null)} variant="secondary" className="px-10 py-3.5 text-lg w-full sm:w-auto font-bold">Batal & Kembali</Button>
              </div>
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
      <div className="space-y-6 w-full max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 w-full">
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-slate-800">Laporan Pembaharuan</h2>
            <p className="text-slate-500 font-medium truncate">Pantau siapa saja yang belum mengisi data.</p>
          </div>
          <Button variant="outline" className="w-full sm:w-auto shrink-0" onClick={handlePrintLaporan}><Printer size={18} /> Cetak Laporan</Button>
        </div>

        <div className="flex gap-2">
          <button className={`px-6 py-3 font-bold rounded-t-2xl transition-all flex-1 sm:flex-none ${tabLaporan === 'jemaat' ? 'bg-white text-indigo-600 shadow-sm border-t border-x border-slate-200' : 'text-slate-500 hover:bg-white/50 border border-transparent'}`} onClick={() => setTabLaporan('jemaat')}>Status Jemaat</button>
          <button className={`px-6 py-3 font-bold rounded-t-2xl transition-all flex-1 sm:flex-none ${tabLaporan === 'pendeta' ? 'bg-white text-indigo-600 shadow-sm border-t border-x border-slate-200' : 'text-slate-500 hover:bg-white/50 border border-transparent'}`} onClick={() => setTabLaporan('pendeta')}>Status Pendeta</button>
        </div>

        <Card className="p-0 overflow-hidden shadow-sm border-slate-200 rounded-tl-none -mt-1 relative z-10 w-full">
          <div className="overflow-y-auto max-h-[60vh] p-4 md:p-6 bg-slate-50/50">
            <div className="space-y-3">
              {tabLaporan === 'jemaat' ? (
                laporanJemaat.map((j, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-shadow gap-4">
                    <div className="min-w-0">
                      <p className="font-black text-slate-800 text-lg truncate">{j.name}</p>
                      <p className="text-sm font-semibold text-slate-500 bg-slate-100 inline-block px-2 py-0.5 rounded mt-1 truncate max-w-full">{j.teritori} • {j.status}</p>
                    </div>
                    <div className="flex gap-6 text-sm font-medium border-t sm:border-0 pt-3 sm:pt-0 border-slate-100 shrink-0">
                      <div className={`flex flex-col items-center ${j.hasData ? 'text-emerald-600' : 'text-rose-500'}`}>
                         {j.hasData ? <CheckCircle size={28} /> : <XCircle size={28} />} <span className="text-[11px] font-bold mt-1.5 uppercase tracking-wider">Data Rincian</span>
                      </div>
                      <div className={`flex flex-col items-center ${j.hasProfil ? 'text-emerald-600' : 'text-rose-500'}`}>
                         {j.hasProfil ? <CheckCircle size={28} /> : <XCircle size={28} />} <span className="text-[11px] font-bold mt-1.5 uppercase tracking-wider">Profil Gereja</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                laporanPendeta.map((p, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-shadow gap-4">
                    <div className="min-w-0">
                      <p className="font-black text-slate-800 text-lg truncate">{p.name}</p>
                      <p className="text-sm font-semibold text-slate-500 bg-slate-100 inline-block px-2 py-0.5 rounded mt-1 truncate max-w-full">{p.gender}</p>
                    </div>
                    <div className={`flex flex-col items-center text-sm font-medium border-t sm:border-0 pt-3 sm:pt-0 border-slate-100 shrink-0 ${p.hasProfil ? 'text-emerald-600' : 'text-rose-500'}`}>
                       {p.hasProfil ? <CheckCircle size={28} /> : <XCircle size={28} />} <span className="text-[11px] font-bold mt-1.5 uppercase tracking-wider">Profil Pelayanan</span>
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

  if (!fbUser) return <div className="min-h-screen flex items-center justify-center bg-slate-100"><div className="animate-pulse bg-white px-8 py-4 rounded-full shadow-sm border border-slate-200 text-indigo-600 font-bold text-lg flex items-center gap-3"><Clock className="animate-spin"/> Menghubungkan ke Sistem...</div></div>;
  if (!currentUser) return <LoginView />;

  const menuItems = [
    { id: 'dashboard', label: 'Infografis Utama', icon: LayoutDashboard },
    { id: 'data_jemaat', label: 'Data Jemaat', icon: Users },
    { id: 'profil_jemaat', label: 'Profil Jemaat', icon: MapPin },
    { id: 'profil_pendeta', label: 'Profil Pendeta', icon: UserCircle },
    { id: 'laporan', label: 'Cek Pembaharuan', icon: FileText }
  ];

  if (currentUser.role === 'Admin') {
    menuItems.push({ id: 'admin_settings', label: 'Manajemen Data', icon: Settings });
  }

  return (
    // Penambahan w-full, max-w-[100vw] dan overflow-x-hidden ketat untuk mencegah layout HP tergeser
    <div className="flex h-[100dvh] bg-slate-100 font-sans text-slate-800 overflow-hidden w-full max-w-[100vw]">
      
      {toast && (
        <div className={`fixed top-4 right-4 md:top-8 md:right-8 z-[100] px-5 py-4 rounded-2xl shadow-xl flex items-center gap-3 text-white transition-all transform translate-y-0 ${toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
          {toast.type === 'error' ? <XCircle size={24} /> : <CheckCircle size={24} />}
          <span className="font-bold">{toast.msg}</span>
        </div>
      )}

      {/* Sidebar Desktop */}
      <aside className="w-72 shrink-0 bg-white border-r border-slate-200 hidden md:flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-4 text-indigo-600">
            <div className="bg-indigo-50 p-2 rounded-xl shrink-0">
               <img src="https://i.imgur.com/XV3hpOH.png" alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-lg tracking-tight leading-tight text-slate-800 truncate">Sistem Jemaat</h1>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest truncate">Klasis Mollo Barat</p>
            </div>
          </div>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-2">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-[15px] ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}`}>
              <item.icon size={20} className={activeTab === item.id ? 'text-white/90' : 'text-slate-400'} /> {item.label}
            </button>
          ))}
        </div>
        <div className="p-5 border-t border-slate-100 bg-slate-50/50">
          <div className="px-4 py-3 mb-3 bg-white border border-slate-200 rounded-xl shadow-sm">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Login Sebagai</p>
            <p className="text-sm font-black text-slate-800 truncate">{currentUser.name}</p>
            <p className="text-xs text-indigo-600 font-bold mt-0.5 truncate">{currentUser.role}</p>
          </div>
          <button onClick={() => setCurrentUser(null)} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all font-bold text-sm"><LogOut size={18} /> Keluar Sistem</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-50 overflow-hidden relative w-full">

        {/* Mobile Topbar & Pills */}
        <div className="md:hidden flex flex-col w-full z-30 bg-white border-b border-slate-200 shadow-sm shrink-0">
          <div className="p-4 flex justify-between items-center w-full">
             <div className="flex items-center gap-3 min-w-0">
               <img src="https://i.imgur.com/XV3hpOH.png" alt="Logo" className="w-9 h-9 object-contain shrink-0" />
               <div className="min-w-0">
                  <h1 className="font-black text-[15px] text-slate-800 leading-tight truncate">Sistem Jemaat</h1>
                  <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest truncate">Klasis Mollo Barat</p>
               </div>
             </div>
             <button onClick={() => setCurrentUser(null)} className="text-rose-500 bg-rose-50 p-2.5 rounded-xl shrink-0"><LogOut size={18}/></button>
          </div>
          <div className="px-4 pb-3 flex overflow-x-auto gap-2 hide-scrollbar snap-x w-full">
            {menuItems.map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`snap-center whitespace-nowrap px-4 py-2.5 rounded-full text-sm font-bold border transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' : 'bg-white text-slate-600 border-slate-200'}`}>{item.label}</button>
            ))}
          </div>
        </div>

        {/* Main Scrollable Content - Penambahan overflow-x-hidden untuk mencegah bocor */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full">
          <div className="p-4 md:p-8 w-full max-w-7xl mx-auto min-h-full">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full pb-10">
              {activeTab === 'dashboard' && <DashboardView />}
              {activeTab === 'data_jemaat' && <DataJemaatView />}
              {activeTab === 'profil_jemaat' && <ProfilJemaatView />}
              {activeTab === 'profil_pendeta' && <ProfilPendetaView />}
              {activeTab === 'laporan' && <LaporanPembaharuanView />}
              {activeTab === 'admin_settings' && currentUser.role === 'Admin' && <AdminSettingsView />}
            </div>
          </div>
        </main>

      </div>
    </div>
  );
}