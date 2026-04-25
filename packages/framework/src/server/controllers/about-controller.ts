import type { Controller } from "@server/types"

export const AboutController = {
    salam: async ({ req, res }) => {
        const nama = req.param('nama', '')
        const umur = req.param('umur', 0)

        res.renderProps('salam', { nama, umur })
    }
} satisfies Controller