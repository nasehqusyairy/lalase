import { view } from "@server/core/inertia"
import type { Controller } from "@server/types"

export default {
    salam({ request }) {
        const nama = request.params.nama || 'Tamu'
        const umur = request.params.umur || 'tidak diketahui'

        return view('salam', { nama, umur })
    }
} satisfies Controller
