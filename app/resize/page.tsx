import type { Metadata } from 'next'
import ToolPage from '@/components/ToolPage'
import ImageBatchTool from '@/components/ImageBatchTool'

export const metadata: Metadata = { title: 'Image Resizer | File Reducer' }

export default function Page() {
  return (
    <ToolPage title="Image Resizer" description="Change image dimensions by percentage or by pixels.">
      <ImageBatchTool mode="resize" />
    </ToolPage>
  )
}
