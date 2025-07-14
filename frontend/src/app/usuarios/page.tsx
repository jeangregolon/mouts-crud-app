'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { UserTable } from '@/components/users/UserTable'
import Link from 'next/link'

export default function UsersPage() {
  
  const { data: users, isLoading, isRefetching } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users')
      return response.data
    },
    staleTime: process.env.STALE_TIME ? Number(process.env.STALE_TIME) : 5 * 60 * 1000
  })

  if (isLoading) return (
  <div className="container mx-auto p-4">
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded"></div>
        ))}
      </div>
    </div>
  </div>
)

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <div className="flex items-center gap-2">
          {isRefetching && <span className="text-sm text-gray-500">Atualizando...</span>}
          <Link
            href="/usuarios/criar"
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors cursor-pointer"
          >
            Criar usuário
          </Link>
        </div>
      </div>
      <UserTable users={users} />
    </div>
  )
}