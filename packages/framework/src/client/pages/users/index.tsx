import { TUser } from "@shared/types/models/user"

type Props = {
    users: TUser[]
}

export default ({ users }: Props) => {
    return (
        <>
            <h1>Users</h1>
            <ul>
                {users.map(u => (
                    <li key={u.id}>{u.email}</li>
                ))}
            </ul>
        </>
    )
}