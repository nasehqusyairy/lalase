import type { Controller } from "@server/types"

export default {
    async salam({ req, res }) {
        const nama = req.params.nama || 'Tamu'
        const umur = req.query.umur || 'tidak diketahui'

        res.inertia.render('salam', { nama, umur })
    }
} satisfies Controller
