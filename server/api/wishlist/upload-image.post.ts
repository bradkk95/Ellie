export default eventHandler(async (event) => {
  const formData = await readFormData(event)
  const password = formData.get('password') as string
  const file = formData.get('file') as File

  // Verify password
  const config = useRuntimeConfig()
  const adminPassword = config.adminPassword || 'ellie2024'

  if (password !== adminPassword) {
    throw createError({
      statusCode: 401,
      message: 'Invalid password'
    })
  }

  if (!file) {
    throw createError({
      statusCode: 400,
      message: 'No file provided'
    })
  }

  try {
    const blob = hubBlob()

    // Generate unique filename
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(7)
    const ext = file.name.split('.').pop()
    const filename = `wishlist-items/${timestamp}-${randomStr}.${ext}`

    // Upload to blob storage
    await blob.put(filename, file, {
      addRandomSuffix: false
    })

    return {
      url: filename,
      success: true
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to upload image'
    })
  }
})
