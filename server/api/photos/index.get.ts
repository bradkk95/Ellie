export default eventHandler(async (event) => {
  const db = hubDatabase()

  const results = await db.prepare(
    'SELECT * FROM photos ORDER BY order_index ASC'
  ).all()

  return {
    results: results.results || []
  }
})
