export default eventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const query = getQuery(event)
  const password = query.password as string

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

  await db.prepare('DELETE FROM wishlist WHERE id = ?').bind(id).run()

  return { success: true }
})
