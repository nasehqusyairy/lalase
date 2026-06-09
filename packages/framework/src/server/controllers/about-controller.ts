import { view } from "@server/core/inertia"
import type { Controller } from "@server/types"

export default {
    salam({ req }) {
        const nama = req.params.nama || 'Tamu'
        const umur = req.params.umur || 'tidak diketahui'

        return view('salam', { nama, umur })
    }
} satisfies Controller
