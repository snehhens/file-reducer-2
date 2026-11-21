'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

interface ToolCardProps {
  title: string
  description: string
  icon: React.ReactNode
  href: string
}

export default function ToolCard({ title, description, icon, href }: ToolCardProps) {
  return (
    <Link href={href} className="block">
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="h-full bg-white/90 hover:bg-white backdrop-blur-sm rounded-xl p-6 transition-colors"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg text-purple-600">{icon}</div>
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-600">{description}</p>
      </motion.div>
    </Link>
  )
}
