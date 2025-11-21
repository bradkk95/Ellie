export default eventHandler(async (event) => {
  const body = await readBody(event)
  const { password } = body

  const config = useRuntimeConfig(event)
  const adminPassword = config.adminPassword || 'ellie2024'

  return {
    valid: password === adminPassword
  }
})
