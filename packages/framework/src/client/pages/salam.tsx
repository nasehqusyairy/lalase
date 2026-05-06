import { Link } from "../components/link"

export default ({ nama, umur }: { nama: string, umur: number }) => {
    return (
        <>
            <h1>Halo {nama}, umurmu {umur} tahun</h1>
            <Link href="/" >Home</Link>
        </>
    )
}