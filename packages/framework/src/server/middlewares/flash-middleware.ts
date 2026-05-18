import type { Middleware } from '@server/types';

/**
 * Flash Middleware untuk Inertia
 * 
 * Aturan Flash Data:
 * 1. Ambil data dari session request SAAT INI untuk dibagikan ke Inertia.
 * 2. HAPUS dari session agar tidak muncul lagi di request BERIKUTNYA.
 */
export default (({ req, res, next }) => {
    // 1. Ekstrak data flash dari session saat ini (default ke objek kosong/undefined jika tidak ada)
    const flashData = {
        errors: req.session?._errors || {},
        old: req.session?._old || {},
        success: req.session?._success || null,
        message: req.session?._message || null,
    };

    // 2. Sediakan data ini agar bisa diakses oleh Inertia adapter Anda
    // Anda bisa menaruhnya di res.locals atau langsung daftarkan ke shared data Inertia
    res.locals = {
        ...res.locals,
        flash: flashData
    };

    // Alternatif jika framework Anda punya shared helper langsung:
    // req.inertia.share('errors', flashData.errors);
    // req.inertia.share('flash', { success: flashData.success, message: flashData.message });

    // 3. SEGERA BERSIHKAN SESSION (Flash Lifecycle)
    // Setelah dipindahkan ke context request saat ini (res.locals), kita aman menghapusnya dari session
    if (req.session) {
        delete req.session._errors;
        delete req.session._old;
        delete req.session._success;
        delete req.session._message;
    }

    next();
}) as Middleware;