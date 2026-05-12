import { Link } from "@inertiajs/react"

type Props = {
    nama: string,
    umur: number
}

export default ({ nama, umur }: Props) => {
    return (
        <>
            <h1>Halo {nama}, umurmu {umur} tahun</h1>
            <Link href="/" >Home</Link>
        </>
    )
}