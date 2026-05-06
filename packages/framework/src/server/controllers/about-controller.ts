import type { Controller } from "@server/types"

export default {
    async salam({ req, res }) {
        const nama = req.param('nama', '')
        const umur = req.param('umur', 0)

        res.renderProps('salam', { nama, umur })
    }
} satisfies Controller