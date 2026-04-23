import FormExample from "@client/components/form-example"
import { TUser } from "@shared/types"

const books = [
    {
        id: 1,
        title: 'Pulang'
    }
]

export default ({ users }: { users: TUser[] }) => {
    return (
        <>
            <FormExample />
            {/* <form method="post">
                <input type="text" name="title" />
                <button>submit</button>
            </form> */}
            <h1>Users</h1>
            <ul>
                {users.map(u => (
                    <li key={u.id}>{u.email}</li>
                ))}
            </ul>


            {/* <h1>Books: </h1>
            <ul>
                {books.map(book => (
                    <li key={book.id}>{book.title}</li>
                ))}
            </ul> */}
        </>
    )
}