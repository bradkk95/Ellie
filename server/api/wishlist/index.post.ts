export default eventHandler(async (event) => {
  const body = await readBody(event)
  const { password, item } = body

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
    `INSERT INTO wishlist (item_name, emoji, store, link, price, image_url, order_index)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    item.item_name,
    item.emoji || '🎁',
    item.store || 'other',
    item.link || null,
    item.price || null,
    item.image_url || null,
    item.order_index || 0
  ).run()

  return {
    success: true,
    id: result.meta.last_row_id
  }
})
