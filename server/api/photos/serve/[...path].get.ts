export default eventHandler(async (event) => {
  const path = getRouterParam(event, 'path')

  if (!path) {
    throw createError({
      statusCode: 400,
      message: 'No path provided'
    })
  }

  try {
    const blob = hubBlob()
    const file = await blob.get(path)

    if (!file) {
      throw createError({
        statusCode: 404,
        message: 'Image not found'
      })
    }

    // Set appropriate headers
    setHeader(event, 'Content-Type', file.type || 'image/jpeg')
    setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')

    return file
  } catch (error) {
    throw createError({
      statusCode: 404,
      message: 'Image not found'
    })
  }
})
