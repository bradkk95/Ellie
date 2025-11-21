export default eventHandler(async (event) => {
  const { password, items } = await readBody(event)

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

  // Update order_index for each item
  for (const item of items) {
    await db.prepare('UPDATE wishlist SET order_index = ? WHERE id = ?')
      .bind(item.order_index, item.id)
      .run()
  }

  return { success: true }
})
