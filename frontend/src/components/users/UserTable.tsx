import Link from 'next/link'
import { User } from '@/lib/types'

interface UserTableProps {
  users: User[]
}

export function UserTable({ users }: UserTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr>
            <th className="py-2 px-4 border">ID</th>
            <th className="py-2 px-4 border">Nome</th>
            <th className="py-2 px-4 border">Email</th>
            <th className="py-2 px-4 border">Ações</th>
          </tr>
        </thead>
        <tbody>
          {users && users.map((user) => (
              <tr key={user.id}>
              <td className="py-2 px-4 border">{user.id}</td>
              <td className="py-2 px-4 border">{user.name}</td>
              <td className="py-2 px-4 border">{user.email}</td>
              <td className="py-2 px-4 border">
                <Link href={`/usuarios/${user.id}`} className="text-blue-500 hover:text-blue-700">
                  Editar
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
        {!users && <p className="text-center pt-2">Nenhum usuário encontrado</p>}
    </div>
  )
}