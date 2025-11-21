<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'

const colorMode = useColorMode()

const password = ref('')
const isAuthenticated = ref(false)
const items = ref<any[]>([])
const photos = ref<any[]>([])
const editingItem = ref<any>(null)
const editingPhoto = ref<any>(null)
const showForm = ref(false)
const showPhotoForm = ref(false)
const activeTab = ref('wishlist')
const isDragging = ref(false)

// Check for stored authentication on mount
onMounted(() => {
  if (import.meta.client) {
    const stored = localStorage.getItem('admin_auth')
    if (stored) {
      try {
        const { password: storedPassword, timestamp } = JSON.parse(stored)
        // Check if session is less than 24 hours old
        const twentyFourHours = 24 * 60 * 60 * 1000
        if (Date.now() - timestamp < twentyFourHours) {
          password.value = storedPassword
          verifyPassword(true)
        }
        else {
          localStorage.removeItem('admin_auth')
        }
      }
      catch (e) {
        localStorage.removeItem('admin_auth')
      }
    }
  }
})

const formData = ref({
  item_name: '',
  emoji: '🎁',
  store: 'other',
  link: '',
  price: null as number | null,
  image_url: '',
  order_index: 0
})

const photoFormData = ref({
  image_url: '',
  caption: '',
  order_index: 0
})

const selectedFile = ref<File | File[] | null>(null)
const selectedItemImageFile = ref<File | File[] | null>(null)
const uploadingFile = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const isFetchingProductInfo = ref(false)

const stores = [
  { value: 'amazon', label: '📦 Amazon', name: 'Amazon', logo: '📦' },
  { value: 'target', label: '🎯 Target', name: 'Target', logo: '🎯' },
  { value: 'walmart', label: '🛒 Walmart', name: 'Walmart', logo: '🛒' },
  { value: 'other', label: '🎁 Other', name: 'Other', logo: '🎁' }
]

const popularEmojis = [
  '🎁',
  '🎨',
  '📚',
  '🎮',
  '✨'
]

function getBlobUrl(url: string) {
  if (url.startsWith('http')) return url
  const path = url.startsWith('/') ? url : `/${url}`
  const cleanPath = path.startsWith('/') ? path.substring(1) : path
  return `/api/photos/serve/${cleanPath}`
}

async function verifyPassword(silent = false) {
  try {
    const result = await $fetch('/api/admin/verify', {
      method: 'POST',
      body: { password: password.value }
    })

    if (result.valid) {
      isAuthenticated.value = true
      // Store authentication in localStorage with timestamp (24 hour expiration)
      if (import.meta.client) {
        localStorage.setItem(
          'admin_auth',
          JSON.stringify({
            password: password.value,
            timestamp: Date.now()
          })
        )
      }
      await loadItems()
      await loadPhotos()
    }
    else {
      if (!silent) {
        errorMessage.value = 'Invalid password'
      }
      if (import.meta.client) {
        localStorage.removeItem('admin_auth')
      }
    }
  }
  catch (error) {
    if (!silent) {
      errorMessage.value = 'Error verifying password'
    }
    if (import.meta.client) {
      localStorage.removeItem('admin_auth')
    }
  }
}

function logout() {
  if (import.meta.client) {
    localStorage.removeItem('admin_auth')
  }
  isAuthenticated.value = false
  password.value = ''
}

async function loadItems() {
  try {
    const data = await $fetch('/api/wishlist')
    items.value = data.results || []
  }
  catch (error) {
    errorMessage.value = 'Error loading items'
  }
}

async function loadPhotos() {
  try {
    const data = await $fetch('/api/photos')
    photos.value = data.results || []
  }
  catch (error) {
    errorMessage.value = 'Error loading photos'
  }
}

function openAddForm() {
  editingItem.value = null
  formData.value = {
    item_name: '',
    emoji: '🎁',
    store: 'other',
    link: '',
    price: null,
    image_url: '',
    order_index: items.value.length
  }
  selectedItemImageFile.value = null
  errorMessage.value = ''
  showForm.value = true
}

function openEditForm(item: any) {
  editingItem.value = item
  formData.value = { ...item }
  selectedItemImageFile.value = null
  errorMessage.value = ''
  showForm.value = true
}

function openAddPhotoForm() {
  editingPhoto.value = null
  photoFormData.value = {
    image_url: '',
    caption: '',
    order_index: photos.value.length
  }
  selectedFile.value = null
  errorMessage.value = ''
  showPhotoForm.value = true
}

function openEditPhotoForm(photo: any) {
  editingPhoto.value = photo
  photoFormData.value = { ...photo }
  errorMessage.value = ''
  showPhotoForm.value = true
}

function getFileFromValue(value: File | File[] | null): File | null {
  if (!value) return null
  if (Array.isArray(value)) return value[0] || null
  return value
}

async function fetchProductInfo() {
  if (!formData.value.link) {
    errorMessage.value = 'Please enter a product link first'
    return
  }

  isFetchingProductInfo.value = true
  errorMessage.value = ''

  try {
    const productInfo = (await $fetch('/api/product-info', {
      method: 'POST',
      body: { url: formData.value.link }
    })) as any

    if (productInfo?.error) {
      errorMessage.value = productInfo.error
    }
    else {
      if (productInfo?.title && !formData.value.item_name) {
        formData.value.item_name = productInfo.title
      }
      if (productInfo?.price && !formData.value.price) {
        formData.value.price = productInfo.price
      }
      if (productInfo?.image) {
        formData.value.image_url = productInfo.image
      }
      if (productInfo?.store && productInfo.store !== 'other') {
        formData.value.store = productInfo.store
      }
      successMessage.value = 'Product info loaded!'
      setTimeout(() => {
        successMessage.value = ''
      }, 2000)
    }
  }
  catch (error) {
    errorMessage.value = 'Failed to fetch product information'
  }
  finally {
    isFetchingProductInfo.value = false
  }
}

async function saveItem() {
  try {
    if (!formData.value.item_name) {
      errorMessage.value = 'Item name is required'
      return
    }

    uploadingFile.value = true

    // Upload image if a new file was selected
    const file = getFileFromValue(selectedItemImageFile.value)
    if (file) {
      const imageFormData = new FormData()
      imageFormData.append('file', file)
      imageFormData.append('password', password.value)

      const uploadResult = (await $fetch('/api/wishlist/upload-image', {
        method: 'POST',
        body: imageFormData
      })) as any

      formData.value.image_url = uploadResult.url
    }

    if (editingItem.value) {
      await $fetch(`/api/wishlist/${editingItem.value.id}`, {
        method: 'PUT',
        body: { password: password.value, item: formData.value }
      })
      successMessage.value = 'Item updated successfully!'
    }
    else {
      await $fetch('/api/wishlist', {
        method: 'POST',
        body: { password: password.value, item: formData.value }
      })
      successMessage.value = 'Item added successfully!'
    }

    showForm.value = false
    await loadItems()
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  }
  catch (error: any) {
    errorMessage.value = error.data?.message || 'Error saving item'
  }
  finally {
    uploadingFile.value = false
  }
}

async function deleteItem(item: any) {
  if (!confirm(`Delete "${item.item_name}"?`)) return

  try {
    await $fetch(`/api/wishlist/${item.id}?password=${encodeURIComponent(password.value)}`, {
      method: 'DELETE'
    })
    successMessage.value = 'Item deleted!'
    await loadItems()
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  }
  catch (error) {
    errorMessage.value = 'Error deleting item'
  }
}

async function savePhoto() {
  try {
    uploadingFile.value = true
    errorMessage.value = ''

    if (editingPhoto.value && !selectedFile.value) {
      await $fetch(`/api/photos/${editingPhoto.value.id}`, {
        method: 'PUT',
        body: { password: password.value, photo: photoFormData.value }
      })
      successMessage.value = 'Photo updated!'
    }
    else {
      const file = getFileFromValue(selectedFile.value)
      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('password', password.value)
        formData.append('caption', photoFormData.value.caption)
        formData.append(
          'order_index',
          photoFormData.value.order_index.toString()
        )

        await $fetch('/api/photos/upload', {
          method: 'POST',
          body: formData
        })
        successMessage.value = 'Photo uploaded!'
      }
      else {
        errorMessage.value = 'Please select a photo'
        uploadingFile.value = false
        return
      }
    }

    showPhotoForm.value = false
    await loadPhotos()
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  }
  catch (error: any) {
    errorMessage.value = error.data?.message || 'Error saving photo'
  }
  finally {
    uploadingFile.value = false
  }
}

async function deletePhoto(photo: any) {
  if (!confirm('Delete this photo?')) return

  try {
    await $fetch(`/api/photos/${photo.id}?password=${encodeURIComponent(password.value)}`, {
      method: 'DELETE'
    })
    successMessage.value = 'Photo deleted!'
    await loadPhotos()
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  }
  catch (error) {
    errorMessage.value = 'Error deleting photo'
  }
}

function getItemActions(item: any) {
  return [
    [
      {
        label: 'Edit',
        icon: 'i-heroicons-pencil-square',
        onSelect: () => openEditForm(item)
      }
    ],
    [
      {
        label: 'Delete',
        icon: 'i-heroicons-trash',
        onSelect: () => deleteItem(item)
      }
    ]
  ]
}

function getPhotoActions(photo: any) {
  return [
    [
      {
        label: 'Edit Caption',
        icon: 'i-heroicons-pencil-square',
        onSelect: () => openEditPhotoForm(photo)
      }
    ],
    [
      {
        label: 'Delete',
        icon: 'i-heroicons-trash',
        onSelect: () => deletePhoto(photo)
      }
    ]
  ]
}

async function onItemsReorder() {
  try {
    // Update order_index for each item based on new position
    const updatedItems = items.value.map((item, index) => ({
      ...item,
      order_index: index
    }))

    items.value = updatedItems

    // Save to database
    await $fetch('/api/wishlist/reorder', {
      method: 'POST',
      body: {
        password: password.value,
        items: updatedItems.map(item => ({
          id: item.id,
          order_index: item.order_index
        }))
      }
    })
  }
  catch (error) {
    errorMessage.value = 'Failed to reorder items'
    await loadItems() // Reload to restore original order
  }
}

async function onPhotosReorder() {
  try {
    // Update order_index for each photo based on new position
    const updatedPhotos = photos.value.map((photo, index) => ({
      ...photo,
      order_index: index
    }))

    photos.value = updatedPhotos

    // Save to database
    await $fetch('/api/photos/reorder', {
      method: 'POST',
      body: {
        password: password.value,
        photos: updatedPhotos.map(photo => ({
          id: photo.id,
          order_index: photo.order_index
        }))
      }
    })
  }
  catch (error) {
    errorMessage.value = 'Failed to reorder photos'
    await loadPhotos() // Reload to restore original order
  }
}
</script>

<template>
  <div class="min-h-screen">
    <!-- Login Screen -->
    <div
      v-if="!isAuthenticated"
      class="flex items-center justify-center min-h-screen p-4"
    >
      <UCard class="max-w-md w-full">
        <template #header>
          <div class="text-center space-y-2">
            <div class="text-4xl">
              🎄
            </div>
            <h1 class="text-2xl font-bold">
              Admin Login
            </h1>
            <p class="text-sm">
              Enter password to manage the wishlist
            </p>
          </div>
        </template>

        <form
          class="space-y-4"
          @submit.prevent="verifyPassword"
        >
          <UFormField
            label="Password"
            :error="errorMessage"
          >
            <UInput
              v-model="password"
              type="password"
              placeholder="Enter password"
              autofocus
            />
          </UFormField>
          <UButton
            label="Login"
            type="submit"
            block
          />
        </form>
      </UCard>
    </div>

    <!-- Admin Dashboard -->
    <div
      v-else
      class="min-h-screen bg-gray-50 dark:bg-gray-900"
    >
      <!-- Header -->
      <div
        class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10"
      >
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-4">
            <div class="flex items-center gap-3">
              <span class="text-3xl">🎅</span>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                Admin Dashboard
              </h1>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                :icon="
                  colorMode.value === 'dark'
                    ? 'i-heroicons-sun'
                    : 'i-heroicons-moon'
                "
                variant="ghost"
                square
                @click="
                  colorMode.preference
                    = colorMode.value === 'dark' ? 'light' : 'dark'
                "
              />
              <NuxtLink
                to="/"
                target="_blank"
              >
                <UButton
                  label="View Site"
                  variant="ghost"
                  trailing-icon="i-heroicons-arrow-top-right-on-square"
                />
              </NuxtLink>
              <UButton
                label="Logout"
                leading-icon="i-heroicons-arrow-right-on-rectangle"
                variant="ghost"
                @click="logout"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Success Message -->
        <UAlert
          v-if="successMessage"
          color="success"
          :title="successMessage"
          class="mb-6"
          :close-button="{ icon: 'i-heroicons-x-mark-20-solid' }"
          @close="successMessage = ''"
        />

        <!-- Tabs -->
        <UTabs
          v-model="activeTab"
          :items="[
            {
              label: 'Wishlist Items',
              icon: 'i-heroicons-gift',
              slot: 'wishlist',
              value: 'wishlist'
            },
            {
              label: 'Photo Slideshow',
              icon: 'i-heroicons-photo',
              slot: 'photos',
              value: 'photos'
            }
          ]"
          class="mb-6"
        >
          <template #wishlist>
            <!-- Wishlist Items -->
            <div class="mt-4">
              <UCard>
                <template #header>
                  <div class="flex justify-between items-center">
                    <h2 class="text-lg font-semibold">
                      Wishlist Items
                    </h2>
                    <UButton
                      label="Create"
                      leading-icon="i-heroicons-plus"
                      @click="openAddForm"
                    />
                  </div>
                </template>

                <div
                  v-if="items.length === 0"
                  class="text-center py-8"
                >
                  <Icon
                    name="i-heroicons-gift"
                    class="w-12 h-12 mx-auto mb-2 opacity-50"
                  />
                  <p>No items yet</p>
                </div>

                <VueDraggable
                  v-if="items.length > 0"
                  v-model="items"
                  class="space-y-2"
                  handle=".drag-handle"
                  @end="onItemsReorder"
                >
                  <div
                    v-for="(item, index) in items"
                    :key="item.id"
                    class="flex items-center gap-3 p-3 border rounded hover:border-primary-500 transition-colors"
                  >
                        <div class="drag-handle cursor-move p-2">
                          <Icon
                            name="i-heroicons-bars-3"
                            class="w-5 h-5"
                          />
                        </div>

                        <div
                          class="flex-1 grid grid-cols-1 md:grid-cols-6 gap-3 items-center"
                        >
                          <div class="flex items-center gap-2">
                            <div
                              class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white font-bold text-sm"
                            >
                              {{ index + 1 }}
                            </div>
                            <span class="font-semibold">{{
                              item.item_name
                            }}</span>
                          </div>

                          <div>
                            <UBadge size="sm">
                              {{ stores.find((s) => s.value === item.store)?.logo }}
                              {{ stores.find((s) => s.value === item.store)?.name }}
                            </UBadge>
                          </div>

                          <div>
                            <span v-if="item.price">${{ item.price }}</span>
                            <span
                              v-else
                              class="opacity-50"
                            >-</span>
                          </div>

                          <div>
                            <UBadge
                              v-if="item.purchased"
                              color="success"
                              size="sm"
                            >
                              Purchased
                            </UBadge>
                            <UBadge
                              v-else
                              size="sm"
                            >
                              Available
                            </UBadge>
                          </div>

                          <div v-if="item.link">
                            <a
                              :href="item.link"
                              target="_blank"
                              class="text-primary-500 hover:underline text-sm"
                            >
                              View Link
                            </a>
                          </div>

                          <div class="flex justify-end">
                            <UDropdownMenu :items="getItemActions(item)">
                              <UButton
                                variant="ghost"
                                icon="i-heroicons-ellipsis-horizontal"
                                size="sm"
                                square
                              />
                            </UDropdownMenu>
                          </div>
                    </div>
                  </div>
                </VueDraggable>
              </UCard>
            </div>
          </template>

          <template #photos>
            <!-- Photos -->
            <div class="mt-4">
              <UCard>
                <template #header>
                  <div class="flex justify-between items-center">
                    <h2 class="text-lg font-semibold">
                      Photo Slideshow
                    </h2>
                    <UButton
                      label="Create"
                      leading-icon="i-heroicons-plus"
                      @click="openAddPhotoForm"
                    />
                  </div>
                </template>

                <div
                  v-if="photos.length === 0"
                  class="text-center py-8"
                >
                  <Icon
                    name="i-heroicons-photo"
                    class="w-12 h-12 mx-auto mb-2 opacity-50"
                  />
                  <p>No photos yet</p>
                </div>

                <VueDraggable
                  v-if="photos.length > 0"
                  v-model="photos"
                  class="space-y-2"
                  handle=".drag-handle"
                  @end="onPhotosReorder"
                >
                  <div
                    v-for="photo in photos"
                    :key="photo.id"
                    class="flex items-center gap-4 p-3 border rounded hover:border-primary-500 transition-colors"
                  >
                        <div class="drag-handle cursor-move p-2">
                          <Icon
                            name="i-heroicons-bars-3"
                            class="w-5 h-5"
                          />
                        </div>

                        <img
                          :src="getBlobUrl(photo.image_url)"
                          alt="Photo"
                          class="w-20 h-20 object-cover rounded"
                        >

                        <div class="flex-1">
                          <p class="font-medium">
                            {{ photo.caption || "No caption" }}
                          </p>
                        </div>

                        <div>
                          <UDropdownMenu :items="getPhotoActions(photo)">
                            <UButton
                              variant="ghost"
                              icon="i-heroicons-ellipsis-horizontal"
                              size="sm"
                              square
                            />
                          </UDropdownMenu>
                    </div>
                  </div>
                </VueDraggable>
              </UCard>
            </div>
          </template>
        </UTabs>
      </div>
    </div>

    <!-- Wishlist Item Modal -->
    <UModal v-model:open="showForm">
      <template #header>
        <h3 class="text-lg font-semibold">
          {{ editingItem ? "Edit Item" : "Create Item" }}
        </h3>
      </template>

      <template #body>
        <form
          class="space-y-4"
          @submit.prevent="saveItem"
        >
          <UAlert
            v-if="errorMessage"
            color="error"
            :title="errorMessage"
            :close-button="{ icon: 'i-heroicons-x-mark-20-solid' }"
            @close="errorMessage = ''"
          />

          <UFormField
            label="Item Name"
            required
          >
            <UInput
              v-model="formData.item_name"
              placeholder="e.g. Unicorn Plushie"
            />
          </UFormField>

          <UFormField label="Emoji">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="emoji in popularEmojis"
                :key="emoji"
                type="button"
                :class="[
                  'p-3 text-2xl border-2 rounded-lg transition-all cursor-pointer',
                  formData.emoji === emoji
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-110'
                    : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:scale-105'
                ]"
                @click="formData.emoji = emoji"
              >
                {{ emoji }}
              </button>
            </div>
          </UFormField>

          <UFormField label="Store">
            <select
              v-model="formData.store"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
            >
              <option value="amazon">
                📦 Amazon
              </option>
              <option value="target">
                🎯 Target
              </option>
              <option value="walmart">
                🛒 Walmart
              </option>
              <option value="other">
                🎁 Other
              </option>
            </select>
          </UFormField>

          <UFormField label="Product Link">
            <div class="flex gap-2">
              <UInput
                v-model="formData.link"
                type="url"
                placeholder="https://..."
                class="flex-1"
              />
              <UButton
                label="Auto-Fill"
                :disabled="!formData.link || isFetchingProductInfo"
                :loading="isFetchingProductInfo"
                @click="fetchProductInfo"
              />
            </div>
          </UFormField>

          <UFormField label="Upload Item Image">
            <UFileUpload
              v-model="selectedItemImageFile"
              accept="image/*"
              label="Drop your image here or click to browse"
              description="PNG, JPG, GIF, or WEBP"
              class="w-full min-h-48"
            />
          </UFormField>

          <UFormField
            v-if="formData.image_url && !selectedItemImageFile"
            label="Current Image"
          >
            <img
              :src="formData.image_url"
              alt="Current"
              class="w-full max-w-sm rounded border"
            >
          </UFormField>

          <UFormField label="Price">
            <UInput
              :model-value="formData.price ?? undefined"
              type="number"
              step="0.01"
              placeholder="0.00"
              @update:model-value="formData.price = $event"
            />
          </UFormField>

          <div class="flex justify-end gap-3 pt-4">
            <UButton
              label="Cancel"
              type="button"
              variant="ghost"
              @click="showForm = false"
            />
            <UButton
              :label="editingItem ? 'Update' : 'Create'"
              type="submit"
            />
          </div>
        </form>
      </template>
    </UModal>

    <!-- Photo Modal -->
    <UModal v-model:open="showPhotoForm">
      <template #header>
        <h3 class="text-lg font-semibold">
          {{ editingPhoto ? "Edit Photo" : "Upload Photo" }}
        </h3>
      </template>

      <template #body>
        <form
          class="space-y-4"
          @submit.prevent="savePhoto"
        >
          <UAlert
            v-if="errorMessage"
            color="error"
            :title="errorMessage"
            :close-button="{ icon: 'i-heroicons-x-mark-20-solid' }"
            @close="errorMessage = ''"
          />

          <UFormField
            v-if="!editingPhoto"
            label="Photo"
            required
          >
            <UFileUpload
              v-model="selectedFile"
              accept="image/*"
              label="Drop your photo here or click to browse"
              description="PNG, JPG, GIF, or WEBP"
              class="w-full min-h-48"
            />
          </UFormField>

          <UFormField
            v-if="editingPhoto?.image_url"
            label="Current Photo"
          >
            <img
              :src="getBlobUrl(editingPhoto.image_url)"
              alt="Current"
              class="w-full rounded border"
            >
          </UFormField>

          <UFormField label="Caption">
            <UInput
              v-model="photoFormData.caption"
              placeholder="e.g. Summer 2024"
            />
          </UFormField>

          <div class="flex justify-end gap-3 pt-4">
            <UButton
              label="Cancel"
              type="button"
              variant="ghost"
              @click="showPhotoForm = false"
            />
            <UButton
              :label="editingPhoto ? 'Update' : 'Upload'"
              type="submit"
              :loading="uploadingFile"
              :disabled="uploadingFile || (!selectedFile && !editingPhoto)"
            />
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>
