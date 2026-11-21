import type { Metadata } from 'next'
import ToolPage from '@/components/ToolPage'
import ImageBatchTool from '@/components/ImageBatchTool'

export const metadata: Metadata = { title: 'Bulk Reducer | File Reducer' }

export default function Page() {
  return (
    <ToolPage title="Bulk Reducer" description="Compress many images at once and download them as a single zip.">
      <ImageBatchTool mode="compress" />
    </ToolPage>
  )
}
