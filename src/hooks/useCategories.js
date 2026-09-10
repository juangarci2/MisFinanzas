import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export const DEFAULT_CATEGORIES = ['Alimentación','Transporte','Ocio','Salud','Hogar','Ropa','Educación']

export function useCategories() {
  const [customCategories, setCustomCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchCategories() }, [])

  async function fetchCategories() {
    const { data } = await supabase.from('categories').select('*').order('name')
    setCustomCategories(data?.map(c => c.name) || [])
    setLoading(false)
  }

  async function addCategory(name) {
    const trimmed = name.trim()
    if (!trimmed || customCategories.includes(trimmed) || DEFAULT_CATEGORIES.includes(trimmed)) return false
    const { error } = await supabase.from('categories').insert([{ name: trimmed }])
    if (!error) {
      setCustomCategories(prev => [...prev, trimmed].sort())
      return true
    }
    return false
  }

  async function deleteCategory(name) {
    await supabase.from('categories').delete().eq('name', name)
    setCustomCategories(prev => prev.filter(c => c !== name))
  }

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories.filter(c => !DEFAULT_CATEGORIES.includes(c))]

  return { allCategories, customCategories, addCategory, deleteCategory, loading, refresh: fetchCategories }
}
