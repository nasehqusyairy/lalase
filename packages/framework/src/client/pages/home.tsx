import { Head, Link, usePage } from "@inertiajs/react";
import { useState } from "react";

export default () => {
    const { allowed } = usePage<{ allowed: { readUsers: boolean } }>().props
    const [count, setCount] = useState(0);
    return (
        <>
            <Head title="Home" />
            <h1>Halaman Home</h1>
            <button onClick={() => setCount(count + 1)}>count {count}</button>
            {allowed.readUsers && (
                <Link href={'/users'}>Users</Link>
            )}
        </>
    )
}