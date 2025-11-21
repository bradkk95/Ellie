export default eventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { purchased, purchased_by } = body

  const db = hubDatabase()

  await db.prepare(
    `UPDATE wishlist
     SET purchased = ?, purchased_by = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(
    purchased ? 1 : 0,
    purchased_by || null,
    id
  ).run()

  return { success: true }
})
