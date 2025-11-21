export default eventHandler(async (event) => {
  const db = hubDatabase()

  const results = await db.prepare(
    'SELECT * FROM wishlist ORDER BY order_index ASC'
  ).all()

  return {
    results: results.results || []
  }
})
