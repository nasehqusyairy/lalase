import { Head, Link, usePage } from "@inertiajs/react";
import { canReadUsers } from "@shared/permissions/user-permission";
import { TUser } from "@shared/types/models/user";
import { useState } from "react";

export default () => {
    const { auth } = usePage<{ auth: TUser }>().props
    const [count, setCount] = useState(0);
    return (
        <>
            <Head title="Home" />
            <h1>Halaman Home</h1>
            <button onClick={() => setCount(count + 1)}>count {count}</button>
            {canReadUsers(auth) && (
                <Link href={'/users'}>Users</Link>
            )}
        </>
    )
}