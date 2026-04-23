/**
 * Fungsi pembantu untuk navigasi SPA
 * @param url Alamat tujuan (string)
 */
export const navigate = async (url: string): Promise<void> => {
    try {
        // Cek apakah fungsi navigateSPA sudah terpasang di window (oleh entry-client)
        if (typeof window !== 'undefined' && (window as any).navigateSPA) {
            await (window as any).navigateSPA(url);
        } else {
            // Fallback: Jika JS belum siap atau error, gunakan navigasi browser standar
            window.location.href = url;
        }
    } catch (error) {
        console.error('Navigasi SPA gagal, beralih ke reload standar:', error);
        window.location.href = url;
    }
};