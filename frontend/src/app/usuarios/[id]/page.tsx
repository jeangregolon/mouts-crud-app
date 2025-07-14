'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { UserForm } from '@/components/users/UserForm'

export default function EditUserPage({ params }: { params: { id: string } }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', params.id],
    queryFn: async () => {
      const response = await api.get(`/users/${params.id}`)
      return response.data
    },
  })

  if (isLoading) return <div>Carregando...</div>

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Editar Usuário</h1>
      <UserForm initialData={user} userId={Number(params.id)} />
    </div>
  )
}