import { supabase } from './supabaseClient'

/**
 * 이미지 파일을 memories bucket에 업로드
 * @param file - 업로드할 이미지 파일
 * @param userId - 업로드하는 유저 ID
 * @param memoryName - 추억 이름
 * @returns Promise<{imageUrl: string, error: string | null}>
 */
export async function uploadMemoryImage(
  file: File,
  userId: string,
  memoryName: string
): Promise<{ imageUrl: string | null; error: string | null }> {
  try {
    // 파일 검증
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return { imageUrl: null, error: 'Unsupported file type' }
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return { imageUrl: null, error: 'File size too large' }
    }

    // 파일명 생성 (유저별 폴더에 저장)
    const fileExt = file.name.split('.').pop()
    const timestamp = new Date().getTime()
    // 파일명에서 특수문자 제거하고 영문/숫자만 허용
    const sanitizedName = memoryName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)
    const fileName = `${userId}/${timestamp}_${sanitizedName}.${fileExt}`

    // Storage에 업로드
    const { data, error } = await supabase.storage
      .from('memory-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Storage upload error:', error)
      return { imageUrl: null, error: error.message }
    }

    // 공개 URL 생성
    const { data: publicUrlData } = supabase.storage
      .from('memory-images')
      .getPublicUrl(fileName)

    return { imageUrl: publicUrlData.publicUrl, error: null }
  } catch (error) {
    console.error('Upload error:', error)
    return { imageUrl: null, error: 'Upload failed' }
  }
}

/**
 * 이미지 파일을 memories bucket에서 삭제
 * @param imageUrl - 삭제할 이미지 URL
 * @returns Promise<{success: boolean, error: string | null}>
 */
export async function deleteMemoryImage(
  imageUrl: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // URL에서 파일 경로 추출
    const url = new URL(imageUrl)
    const pathSegments = url.pathname.split('/')
    const fileName = pathSegments.slice(-2).join('/') // userId/filename 형태

    const { error } = await supabase.storage
      .from('memory-images')
      .remove([fileName])

    if (error) {
      console.error('Storage delete error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Delete error:', error)
    return { success: false, error: 'Delete failed' }
  }
}

/**
 * 파일 타입 검증
 * @param file - 검증할 파일
 * @returns boolean
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'JPG, PNG, GIF 파일만 업로드 가능합니다.' }
  }

  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: '파일 크기는 10MB를 초과할 수 없습니다.' }
  }

  return { valid: true }
}

/**
 * 이미지 URL이 유효한지 확인
 * @param url - 확인할 URL
 * @returns boolean
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.includes('supabase') && url.includes('/storage/v1/object/public/memory-images/')
  } catch {
    return false
  }
} 