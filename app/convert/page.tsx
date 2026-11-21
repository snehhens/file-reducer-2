import type { Metadata } from 'next'
import ToolPage from '@/components/ToolPage'
import ImageBatchTool from '@/components/ImageBatchTool'

export const metadata: Metadata = { title: 'Image Converter | File Reducer' }

export default function Page() {
  return (
    <ToolPage title="Image Converter" description="Convert images between JPG, PNG and WebP.">
      <ImageBatchTool mode="convert" />
    </ToolPage>
  )
}
