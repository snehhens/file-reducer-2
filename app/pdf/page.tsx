import type { Metadata } from 'next'
import ToolPage from '@/components/ToolPage'
import FileReducer from '@/components/FileReducer'

export const metadata: Metadata = { title: 'PDF Reducer | File Reducer' }

export default function Page() {
  return (
    <ToolPage title="PDF Reducer" description="Make large PDFs small enough to email or upload.">
      <FileReducer type="pdf" />
    </ToolPage>
  )
}
