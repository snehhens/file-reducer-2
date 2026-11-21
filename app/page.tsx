import { FileText, Image as ImageIcon, Layers, Maximize, RefreshCw, Scissors } from 'lucide-react'
import ToolCard from '@/components/ToolCard'

const tools = [
  { title: 'Image Reducer', description: 'Compress an image to the exact size you need', icon: ImageIcon, href: '/image' },
  { title: 'PDF Reducer', description: 'Shrink PDFs so they are easy to share', icon: FileText, href: '/pdf' },
  { title: 'Background Remover', description: 'Remove image backgrounds with on-device AI', icon: Scissors, href: '/background' },
  { title: 'Bulk Reducer', description: 'Compress many images at once, get a zip', icon: Layers, href: '/bulk' },
  { title: 'Image Converter', description: 'Convert between JPG, PNG and WebP', icon: RefreshCw, href: '/convert' },
  { title: 'Image Resizer', description: 'Resize by percentage or pixel size', icon: Maximize, href: '/resize' },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-400 to-indigo-600 px-6 py-12 md:py-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <a
            href="https://myportfolio.ovrlzy.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gray-100 text-black px-4 py-2 rounded-full hover:bg-gray-200 transition-colors mb-8"
          >
            Snehens
          </a>
          <h1 className="text-4xl md:text-6xl font-bold text-white">Reduce file size.</h1>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">Not quality.</h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
            No ads, no sign-up. Everything happens locally in your browser, so your files never leave your device.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map(({ icon: Icon, ...t }) => (
            <ToolCard key={t.href} {...t} icon={<Icon className="w-6 h-6" />} />
          ))}
        </div>
      </div>
    </main>
  )
}
