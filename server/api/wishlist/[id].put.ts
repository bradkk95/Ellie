export default eventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
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

  await db.prepare(
    `UPDATE wishlist
     SET item_name = ?, emoji = ?, store = ?, link = ?, price = ?, image_url = ?, order_index = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(
    item.item_name,
    item.emoji || '🎁',
    item.store || 'other',
    item.link || null,
    item.price || null,
    item.image_url || null,
    item.order_index || 0,
    id
  ).run()

  return { success: true }
})
