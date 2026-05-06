import { useRef, useState } from 'react'
import { showToast } from './ToastContainer'
import Button from './Button'
import Loading from '../Loading'
import '../../styles/ImageUploader.css'

interface ImageUploaderProps {
  onImageUpload: (imageUrl: string, filename: string) => void
  onClear?: () => void
  currentImageUrl?: string
  previewOnly?: boolean
  disabled?: boolean
}

export default function ImageUploader({
  onImageUpload,
  onClear,
  currentImageUrl,
  previewOnly = false,
  disabled = false
}: ImageUploaderProps): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [filename, setFilename] = useState<string>('')

  const displayImage = preview || currentImageUrl

  function handleClick(): void {
    if (!previewOnly && !uploading && !disabled) {
      fileInputRef.current?.click()
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>): void {
    if (previewOnly || uploading || disabled) return
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }

  async function uploadFile(file: File): Promise<void> {
    if (!file.type.startsWith('image/')) {
      showToast('Only image files are allowed', 'error')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('File size must be less than 5MB', 'error')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/upload/image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Upload failed')
      }

      const data = await response.json()
      const imageUrl = data.data.url

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result
        if (typeof result === 'string') {
          setPreview(result)
        }
      }
      reader.readAsDataURL(file)

      setFilename(file.name)
      onImageUpload(imageUrl, file.name)
      showToast('Image uploaded successfully!', 'success')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Upload failed'
      showToast(errorMsg, 'error')
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>): void {
    if (previewOnly || uploading || disabled) return
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      void uploadFile(files[0])
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      void uploadFile(files[0])
    }
  }

  function handleClear(): void {
    setPreview(null)
    setFilename('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClear?.()
  }

  return (
    <div className="image-uploader">
      <div
        className={['image-upload-area', dragOver ? 'drag-over' : '', uploading ? 'uploading' : ''].join(' ').trim()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick()
          }
        }}
      >
        {uploading ? (
          <Loading />
        ) : displayImage ? (
          <div className="image-preview-container">
            <img src={displayImage} alt="Preview" className="preview-image" />
            {!previewOnly && !disabled && (
              <div className="image-overlay">
                <Button size="small" variant="primary">
                  Change Image
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="upload-placeholder">
            <div className="upload-icon">📤</div>
            <p className="upload-text">
              {previewOnly ? 'No image selected' : 'Drag and drop image here, or click to select'}
            </p>
            <p className="upload-hint">Supported formats: JPG, PNG, WebP, GIF (Max 5MB)</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={uploading || previewOnly || disabled}
        />
      </div>

      {displayImage && !previewOnly && !disabled && (
        <div className="image-uploader-actions">
          <Button variant="secondary" size="small" onClick={handleClear}>
            Clear
          </Button>
        </div>
      )}

      {filename && (
        <p className="image-filename">
          <small>Filename: {filename}</small>
        </p>
      )}
    </div>
  )
}
