export default eventHandler(async (event) => {
  const body = await readBody(event)
  const { url } = body

  if (!url) {
    return { error: 'URL is required' }
  }

  try {
    // Detect store from URL
    let store = 'other'
    if (url.includes('amazon.com')) store = 'amazon'
    else if (url.includes('target.com')) store = 'target'
    else if (url.includes('walmart.com')) store = 'walmart'

    // For now, return basic info - in production you'd scrape the page
    // This is a placeholder that returns the detected store
    return {
      store,
      title: null,
      price: null,
      image: null
    }
  } catch (error) {
    return { error: 'Failed to fetch product information' }
  }
})
