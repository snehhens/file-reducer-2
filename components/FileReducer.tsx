'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import FileUpload from './FileUpload'
import FileSizeSelector from './FileSizeSelector'
import ProcessFile from './ProcessFile'

interface FileReducerProps {
  type: 'image' | 'pdf'
  onClose?: () => void
}

export default function FileReducer({ type, onClose }: FileReducerProps) {
  const [file, setFile] = useState<File | null>(null)
  const [targetSize, setTargetSize] = useState<number>(1024 * 1024) // 1MB default
  const [customSize, setCustomSize] = useState<number | null>(null)

  const handleFileChange = (newFile: File | null) => {
    setFile(newFile)
    // Reset target size when a new file is uploaded
    setTargetSize(1024 * 1024)
    setCustomSize(null)
  }

  return (
    <div className="w-full space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {!file ? (
          <FileUpload setFile={handleFileChange} type={type} />
        ) : (
          <div className="space-y-6">
            {type === 'pdf' && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                Note: to get a big size reduction, pages are converted to compressed images. Text will no longer be
                selectable. Text-only PDFs that are already small are left unchanged.
              </p>
            )}
            <FileSizeSelector
              file={file}
              targetSize={customSize || targetSize}
              setTargetSize={setTargetSize}
              customSize={customSize}
              setCustomSize={setCustomSize}
            />
            <ProcessFile
              file={file}
              targetSize={customSize || targetSize}
              setFile={handleFileChange}
              type={type}
              onClose={onClose}
            />
          </div>
        )}
      </motion.div>
    </div>
  )
}

