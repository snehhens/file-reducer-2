import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface ToolPageProps {
  title: string
  description: string
  children: React.ReactNode
}

export default function ToolPage({ title, description, children }: ToolPageProps) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-400 to-indigo-600 px-4 py-8 md:py-14">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> All tools
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{title}</h1>
        <p className="text-white/90 mb-6">{description}</p>
        <div className="bg-white rounded-2xl shadow-xl p-5 md:p-8 text-gray-900">{children}</div>
        <p className="text-center text-white/80 text-xs mt-6">
          Everything runs in your browser. Your files never leave your device.
        </p>
      </div>
    </main>
  )
}
