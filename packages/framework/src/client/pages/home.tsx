import { Head, Link } from "@inertiajs/react";
import { useState } from "react";

export default () => {
    const [count, setCount] = useState(0);
    return (
        <>
            <Head title="Home" />
            <h1>Halaman Home</h1>
            <button onClick={() => setCount(count + 1)}>count {count}</button>
            <Link href={'/users'}>Users</Link>
        </>
    )
}