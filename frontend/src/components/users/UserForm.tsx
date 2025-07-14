'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AxiosError } from 'axios'
import { useQueryClient } from '@tanstack/react-query'

const userSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
})

type UserFormData = z.infer<typeof userSchema>

interface UserFormProps {
  initialData?: UserFormData
  userId?: number
}

export function UserForm({ initialData, userId }: UserFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: initialData,
  })

  const onSubmit = async (data: UserFormData) => {
    setError(null)
    setIsSubmitting(true)

    try {
      if (userId) {
        await api.put(`/users/${userId}`, data)
      } else {
        await api.post('/users', data)
      }
      
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      
      router.push('/usuarios')
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(
          err.response?.data?.message || 
          'Ocorreu um erro ao salvar o usuário'
        )
      } else {
        setError('Ocorreu um erro inesperado')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block mb-1">Nome</label>
        <input
          {...register('name')}
          className="w-full p-2 border rounded"
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block mb-1">Email</label>
        <input
          {...register('email')}
          className="w-full p-2 border rounded"
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={`bg-blue-500 text-white p-2 rounded cursor-pointer ${
          isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
        }`}
      >
        {isSubmitting ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}