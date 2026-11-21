// Copies the pdf.js worker into /public so it is served from your own domain.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'

const src = 'node_modules/pdfjs-dist/build/pdf.worker.min.js'
if (existsSync(src)) {
  mkdirSync('public', { recursive: true })
  copyFileSync(src, 'public/pdf.worker.min.js')
  console.log('pdf.worker.min.js copied to /public')
}
