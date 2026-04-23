// 1. Vite akan memindai folder src/pages dan mengambil semua file di dalamnya.
// Asumsikan struktur: src/pages/Home.tsx, src/pages/BowlDetail.tsx
const pages = import.meta.glob('./pages/**/*.tsx', { eager: true });

export default function App({ pageData }: { pageData: any }) {
  // 2. Kita cari komponen yang sesuai dengan nama yang dikirim Controller
  // Misal Controller kirim 'Home', maka kita cari file './pages/Home.tsx'
  const path = `./pages/${pageData.component}.tsx`;

  // Ambil komponen dari hasil glob
  const PageModule: any = pages[path];

  if (!PageModule) {
    return <div>Halaman {pageData.component} tidak ditemukan di folder pages!</div>;
  }

  // Komponen biasanya ada di 'default' export
  const Component = PageModule.default;

  return <Component {...pageData.props} />
}