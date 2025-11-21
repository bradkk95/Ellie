export default eventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { password, photo } = body

  // Verify admin password
  const config = useRuntimeConfig(event)
  const adminPassword = config.adminPassword || 'ellie2024'

  if (password !== adminPassword) {
    throw createError({
      statusCode: 401,
      message: 'Invalid password'
    })
  }

  const db = hubDatabase()

  await db.prepare(
    `UPDATE photos
     SET image_url = ?, caption = ?, order_index = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(
    photo.image_url,
    photo.caption || null,
    photo.order_index || 0,
    id
  ).run()

  return { success: true }
})
