import type { Metadata } from 'next'
import ToolPage from '@/components/ToolPage'
import BackgroundRemover from '@/components/BackgroundRemover'

export const metadata: Metadata = { title: 'Background Remover | File Reducer' }

export default function Page() {
  return (
    <ToolPage title="Background Remover" description="Cut out the subject of any photo using AI that runs on your device.">
      <BackgroundRemover />
    </ToolPage>
  )
}
