export default eventHandler(async (event) => {
  const { password, photos } = await readBody(event)

  // Verify password
  const config = useRuntimeConfig()
  const adminPassword = config.adminPassword || 'ellie2024'

  if (password !== adminPassword) {
    throw createError({
      statusCode: 401,
      message: 'Invalid password'
    })
  }

  const db = hubDatabase()

  // Update order_index for each photo
  for (const photo of photos) {
    await db.prepare('UPDATE photos SET order_index = ? WHERE id = ?')
      .bind(photo.order_index, photo.id)
      .run()
  }

  return { success: true }
})
