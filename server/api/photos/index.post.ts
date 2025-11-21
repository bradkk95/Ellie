export default eventHandler(async (event) => {
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

  const result = await db.prepare(
    `INSERT INTO photos (image_url, caption, order_index)
     VALUES (?, ?, ?)`
  ).bind(
    photo.image_url,
    photo.caption || null,
    photo.order_index || 0
  ).run()

  return {
    success: true,
    id: result.meta.last_row_id
  }
})
