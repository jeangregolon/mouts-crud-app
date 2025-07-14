'use client'

import { UserForm } from '@/components/users/UserForm'

export default function CreateUserPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Criar Usuário</h1>
      <UserForm />
    </div>
  )
}