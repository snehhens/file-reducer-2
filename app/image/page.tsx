import type { Metadata } from 'next'
import ToolPage from '@/components/ToolPage'
import FileReducer from '@/components/FileReducer'

export const metadata: Metadata = { title: 'Image Reducer | File Reducer' }

export default function Page() {
  return (
    <ToolPage title="Image Reducer" description="Shrink an image to the file size you want, right in your browser.">
      <FileReducer type="image" />
    </ToolPage>
  )
}
