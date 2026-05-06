import { useEffect, useMemo, useState } from 'react'
import { showToast } from './ToastContainer'
import Button from './Button'
import '../../styles/RecentImages.css'

interface UploadedImage {
  id: number
  url: string
  filename: string
  uploadedAt: string
}

interface RecentImagesProps {
  onSelectImage: (imageUrl: string, filename: string) => void
  onClose?: () => void
  isOpen: boolean
  currentImageUrl?: string
}

export default function RecentImages({ onSelectImage, onClose, isOpen, currentImageUrl }: RecentImagesProps): JSX.Element | null {
  const [images, setImages] = useState<UploadedImage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    async function fetchRecentImages(): Promise<void> {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/upload/recent?limit=20`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to load recent images')
        }

        const data = await response.json()
        const nextImages = data.data || []
        setImages(nextImages)

        if (currentImageUrl) {
          const matchedImage = nextImages.find((image: UploadedImage) => image.url === currentImageUrl)
          setSelectedImageId(matchedImage?.id ?? null)
        } else {
          setSelectedImageId(null)
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load recent images'
        setError(errorMsg)
        showToast(errorMsg, 'error')
      } finally {
        setLoading(false)
      }
    }

    void fetchRecentImages()

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, currentImageUrl])

  useEffect(() => {
    if (!isOpen) {
      setSelectedImageId(null)
    }
  }, [isOpen])

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedImageId) ?? null,
    [images, selectedImageId]
  )

  function handleUseSelected(): void {
    if (!selectedImage) return

    onSelectImage(selectedImage.url, selectedImage.filename)
    showToast('Image selected!', 'success')
    onClose?.()
  }

  if (!isOpen) return null

  return (
    <div className="recent-images-modal" role="dialog" aria-modal="true" aria-labelledby="recent-images-title">
      <div className="recent-images-overlay" onClick={onClose} />
      <div className="recent-images-container" onClick={(event) => event.stopPropagation()}>
        <div className="recent-images-header">
          <div>
            <p className="recent-images-kicker">Select image</p>
            <h3 id="recent-images-title">Recent Uploads</h3>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close" type="button">×</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="recent-images-content">
          {loading ? (
            <div className="loading-state">
              <p>Loading your recent uploads...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="empty-state">
              <p>No uploaded images yet</p>
              <p className="empty-hint">Upload an image first to see it here</p>
            </div>
          ) : (
            <div className="images-grid">
              {images.map((image) => (
                <div
                  key={image.id}
                  className={['image-card', selectedImageId === image.id ? 'image-card-selected' : ''].join(' ').trim()}
                  onClick={() => setSelectedImageId(image.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedImageId(image.id)
                    }
                  }}
                  aria-pressed={selectedImageId === image.id}
                >
                  <img src={image.url} alt={image.filename} className="image-thumbnail" />
                  <div className="image-card-overlay">
                    <span className="select-label">{selectedImageId === image.id ? 'Selected' : 'Select'}</span>
                    {selectedImageId === image.id && <span className="check-badge">✓</span>}
                  </div>
                  <div className="image-card-meta">
                    <p className="image-card-filename" title={image.filename}>{image.filename}</p>
                    <p className="image-card-date">{new Date(image.uploadedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="recent-images-footer">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUseSelected} disabled={!selectedImage}>
            Use Selected
          </Button>
        </div>
      </div>
    </div>
  )
}
