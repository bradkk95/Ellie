export default eventHandler(async (event) => {
  const formData = await readFormData(event)
  const password = formData.get('password') as string
  const file = formData.get('file') as File
  const caption = formData.get('caption') as string || null
  const orderIndex = parseInt(formData.get('order_index') as string || '0')

  // Verify admin password
  const config = useRuntimeConfig(event)
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

  // Upload to blob storage
  const blob = hubBlob()
  const { pathname } = await blob.put(`photos/${Date.now()}-${file.name}`, file, {
    addRandomSuffix: true,
    contentType: file.type
  })

  // Save to database
  const db = hubDatabase()
  const result = await db.prepare(
    `INSERT INTO photos (image_url, caption, order_index)
     VALUES (?, ?, ?)`
  ).bind(
    pathname,
    caption,
    orderIndex
  ).run()

  return {
    success: true,
    id: result.meta.last_row_id,
    url: pathname
  }
})
