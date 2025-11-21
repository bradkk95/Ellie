<script setup lang="ts">
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const colorMode = useColorMode()
const { data: wishlistData, refresh } = await useFetch('/api/wishlist')
const { data: photosData } = await useFetch('/api/photos')

function processImageUrl(url: string) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const path = url.startsWith('/') ? url.substring(1) : url
  return `/api/photos/serve/${path}`
}

const activeWishlistItems = computed(() =>
  (wishlistData.value?.results || [])
    .filter((item: any) => !item.purchased)
    .map((item: any) => ({
      ...item,
      image_url: processImageUrl(item.image_url)
    }))
)

const purchasedItems = computed(() =>
  (wishlistData.value?.results || [])
    .filter((item: any) => item.purchased)
    .map((item: any) => ({
      ...item,
      image_url: processImageUrl(item.image_url)
    }))
)

const photos = computed(() =>
  (photosData.value?.results || []).map((photo: any) => ({
    ...photo,
    image_url: processImageUrl(photo.image_url)
  }))
)

const showPurchased = ref(false)
const purchasingName = ref('')
const showPurchaseForm = ref(false)
const selectedItem = ref<any>(null)
const showImageModal = ref(false)
const selectedImage = ref<string>('')

// Responsive values that update on resize
const windowWidth = ref(1024) // Start with desktop default for SSR
const isClient = ref(false)

const photosContainerHeight = computed(() => {
  // Mobile: just 100vh (one screen), desktop: scale with photos
  if (!isClient.value) return 600 // SSR default
  if (windowWidth.value < 768) return 100
  const multiplier = windowWidth.value < 1024 ? 100 : 120
  return Math.max(150, photos.value.length * multiplier)
})

const santaSectionHeight = computed(() => {
  if (!isClient.value) return '200vh' // SSR default
  return windowWidth.value < 768
    ? '100vh'
    : windowWidth.value < 1024
      ? '175vh'
      : '200vh'
})

const stores = {
  amazon: { name: 'Amazon', logo: '📦' },
  target: { name: 'Target', logo: '🎯' },
  walmart: { name: 'Walmart', logo: '🛒' },
  other: { name: 'Other', logo: '🎁' }
}

function getStoreInfo(store: string) {
  return stores[store as keyof typeof stores] || stores.other
}

function openPurchaseForm(item: any) {
  selectedItem.value = item
  showPurchaseForm.value = true
  purchasingName.value = ''
}

function openImageModal(imageUrl: string) {
  selectedImage.value = imageUrl
  showImageModal.value = true
}

function getRotation(index: number) {
  const rotations = [-5, 3, -2, 4, -3, 2, -4, 5]
  return rotations[index % rotations.length]
}

async function markAsPurchased() {
  if (!purchasingName.value.trim()) {
    alert('Please enter your name')
    return
  }

  try {
    await $fetch(`/api/wishlist/${selectedItem.value.id}/purchase`, {
      method: 'POST',
      body: {
        purchased: true,
        purchased_by: purchasingName.value.trim()
      }
    })

    showPurchaseForm.value = false
    selectedItem.value = null
    purchasingName.value = ''
    await refresh()
  }
  catch (error) {
    alert('Error marking item as purchased')
  }
}

async function unmarkPurchased(item: any) {
  try {
    await $fetch(`/api/wishlist/${item.id}/purchase`, {
      method: 'POST',
      body: {
        purchased: false,
        purchased_by: null
      }
    })

    await refresh()
  }
  catch (error) {
    alert('Error unmarking item')
  }
}

// GSAP Animations
onMounted(() => {
  // Set client flag and actual window width
  isClient.value = true
  windowWidth.value = window.innerWidth

  // Update window width on resize
  const handleResize = () => {
    windowWidth.value = window.innerWidth
  }
  window.addEventListener('resize', handleResize)

  gsap.registerPlugin(ScrollTrigger)

  // Responsive scroll distances based on screen size
  const isMobile = windowWidth.value < 768
  const isTablet = windowWidth.value >= 768 && windowWidth.value < 1024

  // Adjust scroll distances for different screen sizes
  const santaVideoScrollDistance = isMobile
    ? '+=100vh'
    : isTablet
      ? '+=200vh'
      : '+=300vh'
  const santaTextScrollDistance = isMobile
    ? '+=80vh'
    : isTablet
      ? '+=150vh'
      : '+=200vh'

  // Hero video scale effect on scroll
  gsap.to('.hero-video-container', {
    scrollTrigger: {
      trigger: '.hero-video-section',
      start: 'top top',
      end: 'bottom top',
      scrub: 1
    },
    scale: 0.85,
    borderRadius: '24px',
    ease: 'none'
  })

  // Santa video scale and border radius animation
  const santaVideoAnimation = gsap.to('.santa-video-container', {
    width: '95vw',
    height: '95vh',
    borderRadius: '0px',
    ease: 'none',
    paused: true
  })

  ScrollTrigger.create({
    trigger: '.santa-video-section',
    start: 'top top',
    end: santaVideoScrollDistance,
    scrub: 1,
    animation: santaVideoAnimation
  })

  // Fade-in letters 1 by 1
  const santaTextTimeline = gsap.timeline({ paused: true })

  santaTextTimeline.to('.letter', {
    opacity: 1,
    duration: 0.4,
    stagger: 0.25,
    ease: 'power1.out'
  })

  // Tie letters to scroll
  ScrollTrigger.create({
    trigger: '.santa-video-section',
    start: 'top top',
    end: santaTextScrollDistance,
    scrub: 1,
    animation: santaTextTimeline
    // Add markers in development to debug scroll positions
    // markers: true,
  })

  // Prevent content from scrolling too far past viewport
  ScrollTrigger.config({
    limitCallbacks: true,
    ignoreMobileResize: true // Prevent recalc on mobile keyboard open
  })

  // Hero section animations
  const heroTl = gsap.timeline({ delay: 0.5 })

  // Fade in the main title
  heroTl.from('.hero-title', {
    y: 50,
    opacity: 0,
    duration: 1.2,
    ease: 'power3.out'
  })

  // Typewriter effect for subtitle
  const text = 'Welcome to my Christmas Wishlist'
  const typewriterEl = document.querySelector('.typewriter-text')
  if (typewriterEl) {
    let charIndex = 0
    const typewriterAnimation = () => {
      if (charIndex < text.length) {
        typewriterEl.textContent += text.charAt(charIndex)
        charIndex++
      }
    }

    heroTl.to(
      {},
      {
        duration: text.length * 0.08,
        onUpdate: function () {
          const progress = Math.floor(this.progress() * text.length)
          if (progress > charIndex) {
            typewriterAnimation()
          }
        }
      },
      '+=0.5'
    )
  }

  // Animate wishlist header
  gsap.from('.wishlist-header', {
    scrollTrigger: {
      trigger: '.wishlist-header',
      start: 'top 80%'
    },
    scale: 0.8,
    opacity: 0,
    duration: 0.6,
    ease: 'back.out(1.7)'
  })

  // Stacked tilted photos effect - reveal on scroll (responsive)
  const stackedPhotos = gsap.utils.toArray('.stacked-photo')
  stackedPhotos.forEach((photo: any, index: number) => {
    if (index === 0) return // First photo stays visible

    // Responsive spacing based on screen size - tighter for mobile since section is 100vh
    const baseSpacing = isMobile ? 0 : isTablet ? 800 : 1000
    const animationDuration = isMobile ? 100 : isTablet ? 400 : 500

    const startOffset = index * baseSpacing
    const endOffset = startOffset + animationDuration

    gsap.fromTo(
      photo,
      {
        y: '100vh',
        opacity: 0
      },
      {
        y: 0,
        opacity: 1,
        scrollTrigger: {
          trigger: '.stacked-photos-container',
          start: `top+=${startOffset}px center`,
          end: `top+=${endOffset}px center`,
          scrub: 1
        },
        ease: 'none'
      }
    )
  })

  // Animate wishlist items with scroll trigger
  gsap.utils.toArray('.wishlist-item').forEach((item: any, index: number) => {
    gsap.from(item, {
      scrollTrigger: {
        trigger: item,
        start: 'top 80%',
        toggleActions: 'play none none reverse'
      },
      x: index % 2 === 0 ? -100 : 100,
      opacity: 0,
      rotation: index % 2 === 0 ? -5 : 5,
      duration: 0.8,
      ease: 'power3.out'
    })
  })

  // Bouncing priority badges
  gsap.utils.toArray('.priority-badge').forEach((badge: any, index: number) => {
    gsap.from(badge, {
      scrollTrigger: {
        trigger: badge,
        start: 'top 80%'
      },
      scale: 0,
      rotation: 360,
      duration: 0.8,
      delay: index * 0.1,
      ease: 'elastic.out(1, 0.5)'
    })
  })

  // Sparkle effect on buttons hover
  const buttons = document.querySelectorAll('button, a')
  buttons.forEach((button) => {
    button.addEventListener('mouseenter', () => {
      gsap.to(button, {
        scale: 1.05,
        duration: 0.3,
        ease: 'power2.out'
      })
    })
    button.addEventListener('mouseleave', () => {
      gsap.to(button, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out'
      })
    })
  })

  // 🎄 CHRISTMAS-THEMED ANIMATIONS 🎄

  // Wiggling gift emoji (target the specific gift emoji span)
  const giftEmoji = document.querySelector(
    'header > div > div > span:last-child'
  )
  if (giftEmoji) {
    gsap.to(giftEmoji, {
      rotation: -10,
      duration: 0.5,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut',
      transformOrigin: 'center bottom'
    })
  }

  // Christmas sparkle on store badges
  const badges = document.querySelectorAll('.bg-green-50, .bg-green-900')
  badges.forEach((badge, badgeIndex) => {
    gsap.to(badge, {
      boxShadow: '0 0 15px rgba(34, 197, 94, 0.5)',
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      delay: badgeIndex * 0.3,
      ease: 'sine.inOut'
    })
  })

  // Refresh ScrollTrigger on window resize for responsive adjustments
  let resizeTimeout: ReturnType<typeof setTimeout>
  const handleScrollResize = () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      ScrollTrigger.refresh()
    }, 250)
  }

  window.addEventListener('resize', handleScrollResize)

  // Cleanup on unmount
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('resize', handleScrollResize)
    ScrollTrigger.getAll().forEach(trigger => trigger.kill())
  })
})

// Watch for purchased section showing and animate it
watch(showPurchased, async (newValue) => {
  if (newValue) {
    await nextTick()
    const purchasedSection = document.querySelector('.purchased-section')
    if (purchasedSection) {
      gsap.fromTo(
        purchasedSection,
        {
          scale: 0.8,
          opacity: 0,
          y: 50,
          rotationX: -15
        },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          rotationX: 0,
          duration: 0.8,
          ease: 'back.out(1.7)'
        }
      )

      // Animate individual purchased items
      const purchasedItems = document.querySelectorAll('.purchased-item')
      purchasedItems.forEach((item: any, index: number) => {
        gsap.fromTo(
          item,
          {
            x: -50,
            opacity: 0
          },
          {
            x: 0,
            opacity: 1,
            duration: 0.5,
            delay: 0.3 + index * 0.1,
            ease: 'power2.out'
          }
        )
      })
    }
  }
})
</script>

<template>
  <div class="min-h-screen">
    <!-- Navigation -->
    <nav class="absolute top-0 left-0 right-0 z-[100] pointer-events-none">
      <div class="max-w-7xl mx-auto px-2 md:px-4 py-4 md:py-6">
        <div class="flex items-center justify-center gap-8 md:gap-16">
          <a
            href="#home"
            class="nav-link text-gray-800 dark:text-white text-base md:text-xl pointer-events-auto"
          >
            Home
          </a>
          <a
            v-if="photos.length > 0"
            href="#photos"
            class="nav-link text-gray-800 dark:text-white text-base md:text-xl pointer-events-auto"
          >
            Photos
          </a>
          <a
            href="#santa"
            class="nav-link text-gray-800 dark:text-white text-base md:text-xl pointer-events-auto"
          >
            Santa
          </a>
          <a
            href="#wishlist"
            class="nav-link text-gray-800 dark:text-white text-base md:text-xl pointer-events-auto"
          >
            Wishlist
          </a>
        </div>
      </div>
    </nav>

    <!-- Hero Video Section -->
    <section
      id="home"
      class="hero-video-section relative h-screen w-full overflow-hidden z-0"
    >
      <!-- Video Container with scale effect -->
      <div class="hero-video-container absolute inset-0 z-0">
        <!-- Video Background -->
        <video
          autoplay
          muted
          loop
          playsinline
          preload="auto"
          class="absolute inset-0 w-full h-full object-cover"
        >
          <source
            src="/snow.mp4"
            type="video/mp4"
          >
        </video>

        <!-- Overlay for better text visibility -->
        <div class="absolute inset-0 bg-black/30" />
      </div>

      <!-- Dark Mode Toggle -->
      <div class="absolute top-6 right-6 z-[110]">
        <UButton
          :icon="
            colorMode.value === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'
          "
          variant="ghost"
          square
          size="lg"
          class="text-white hover:bg-white/20"
          @click="
            colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
          "
        />
      </div>

      <!-- Hero Text -->
      <div
        class="relative z-20 h-full flex flex-col items-center justify-center text-center px-4"
      >
        <h1
          class="hero-title text-8xl sm:text-9xl font-bold text-white mb-4"
          style="text-shadow: 2px 4px 8px rgba(0, 0, 0, 0.5)"
        >
          Ellie
        </h1>
        <p
          class="hero-subtitle text-2xl sm:text-3xl text-white font-light"
          style="text-shadow: 1px 2px 4px rgba(0, 0, 0, 0.5)"
        >
          <span class="typewriter-text" /><span class="typewriter-cursor">|</span>
        </p>
      </div>
    </section>

    <!-- Main Content -->
    <main class="relative z-10">
      <!-- Photos Introduction and Stacked Photos Section -->
      <div
        v-if="photos.length > 0"
        id="photos"
      >
        <div
          class="stacked-photos-container relative"
          :style="`height: ${photosContainerHeight}vh;`"
        >
          <!-- Sticky Container for Text and Photos -->
          <div
            class="sticky top-0 left-0 right-0 h-screen pointer-events-none overflow-hidden"
          >
            <div
              class="h-full w-full flex flex-col items-center justify-center px-4 gap-4"
            >
              <!-- Text Section -->
              <div class="text-center flex-shrink-0">
                <h2
                  class="text-5xl font-bold text-red-500 dark:text-white mb-3"
                  style="
                    font-family: 'Georgia', 'Times New Roman', serif;
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
                    letter-spacing: 0.02em;
                  "
                >
                  Memories of Christmases Past
                </h2>
                <p
                  class="text-xl text-green-900 font-semibold dark:text-gray-300 max-w-2xl mx-auto"
                  style="font-family: 'Georgia', 'Times New Roman', serif"
                >
                  I have have always loved Christmas and the joy it brings. Here
                  are some of my favorite moments captured in photos over the
                  years.
                </p>
              </div>

              <!-- Stacked Photos -->
              <div class="relative w-full max-w-2xl flex-shrink-0 h-[400px]">
                <div class="w-full h-full pointer-events-auto">
                  <div
                    v-for="(photo, index) in photos"
                    :key="photo.id"
                    class="stacked-photo absolute inset-0"
                    :style="{
                      transform: `rotate(${getRotation(index)}deg) translateY(${
                        index * 20
                      }px) translateX(${index * 10}px)`,
                      zIndex: index
                    }"
                  >
                    <div
                      class="relative rounded-2xl overflow-hidden shadow-2xl border-8 border-white dark:border-gray-700 bg-white dark:bg-gray-800 h-full"
                    >
                      <img
                        :src="photo.image_url"
                        :alt="photo.caption || `Photo ${index + 1}`"
                        class="w-full h-full object-cover"
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Santa Video Section -->
      <div
        id="santa"
        class="santa-video-section relative"
        :style="`height: ${santaSectionHeight}`"
      >
        <div
          class="sticky top-0 left-0 right-0 h-screen flex items-center justify-center overflow-hidden"
        >
          <div class="santa-video-container relative w-[70vw] h-[50vh]">
            <video
              autoplay
              muted
              loop
              playsinline
              class="w-full h-full object-cover rounded-3xl"
            >
              <source
                src="/santa.mp4"
                type="video/mp4"
              >
            </video>
            <div
              class="santa-text-container absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div
                class="santa-letters flex flex-col items-center text-white font-bold"
              >
                <div class="flex gap-4 text-[6vw] tracking-[1vw]">
                  <span class="letter opacity-0">S</span>
                  <span class="letter opacity-0">A</span>
                  <span class="letter opacity-0">N</span>
                  <span class="letter opacity-0">T</span>
                  <span class="letter opacity-0">A</span>
                </div>
                <div class="flex text-[3vw] mt-4">
                  <span class="letter opacity-0">s</span>
                  <span class="letter opacity-0">a</span>
                  <span class="letter opacity-0">y</span>
                  <span class="letter opacity-0">s</span>
                  <span class="letter opacity-0">&nbsp;</span>
                  <span class="letter opacity-0">I</span>
                  <span class="letter opacity-0">'</span>
                  <span class="letter opacity-0">m</span>
                  <span class="letter opacity-0">&nbsp;</span>
                  <span class="letter opacity-0">o</span>
                  <span class="letter opacity-0">n</span>
                  <span class="letter opacity-0">&nbsp;</span>
                  <span class="letter opacity-0">t</span>
                  <span class="letter opacity-0">h</span>
                  <span class="letter opacity-0">e</span>
                  <span class="letter opacity-0">&nbsp;</span>
                  <span class="letter opacity-0">n</span>
                  <span class="letter opacity-0">i</span>
                  <span class="letter opacity-0">c</span>
                  <span class="letter opacity-0">e</span>
                  <span class="letter opacity-0">&nbsp;</span>
                  <span class="letter opacity-0">l</span>
                  <span class="letter opacity-0">i</span>
                  <span class="letter opacity-0">s</span>
                  <span class="letter opacity-0">t</span>
                  <span class="letter opacity-0">.</span>
                  <span class="letter opacity-0">.</span>
                  <span class="letter opacity-0">.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        id="wishlist"
        class="max-w-7xl mx-auto px-2 md:px-4 py-4 md:py-6"
      >
        <div
          class="wishlist-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 md:mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-3 md:p-4 border-2 border-red-200 dark:border-red-800"
        >
          <h2
            class="text-xl sm:text-2xl font-bold text-red-800 dark:text-red-400"
          >
            🎁 Wishlist Items ({{ activeWishlistItems.length }})
          </h2>
          <UButton
            v-if="purchasedItems.length > 0"
            :label="`🎅 Purchased (${purchasedItems.length})`"
            size="sm"
            class="w-full sm:w-auto"
            @click="showPurchased = !showPurchased"
          />
        </div>

        <!-- Wishlist Items -->
        <div class="space-y-3 md:space-y-4">
          <div
            v-for="(wish, index) in activeWishlistItems"
            :key="wish.id"
            class="wishlist-item bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 md:p-4 border-2 border-green-200 dark:border-green-800 hover:border-red-400 dark:hover:border-red-600 transition-colors"
          >
            <div class="flex flex-col sm:flex-row gap-4">
              <!-- Image -->
              <div class="flex-shrink-0">
                <div class="relative w-full sm:w-40 group">
                  <img
                    v-if="wish.image_url"
                    :src="wish.image_url"
                    :alt="wish.item_name"
                    class="w-full sm:w-40 h-40 object-cover rounded-lg border-4 border-red-200 dark:border-red-800 cursor-pointer hover:opacity-90 transition-opacity"
                    @click="openImageModal(wish.image_url)"
                  >
                  <div
                    v-else
                    class="w-full sm:w-40 h-40 bg-gradient-to-br from-red-100 to-green-100 dark:from-red-900 dark:to-green-900 rounded-lg flex items-center justify-center border-4 border-red-200 dark:border-red-800"
                  >
                    <span class="text-6xl">🎁</span>
                  </div>
                  <!-- Expand Icon -->
                  <div
                    v-if="wish.image_url"
                    class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  >
                    <div
                      class="bg-white/90 dark:bg-gray-800/90 rounded-full p-2 shadow-lg flex items-center justify-center w-8 h-8"
                    >
                      <span class="text-gray-700 dark:text-gray-200">⤢</span>
                    </div>
                  </div>
                  <!-- Priority Badge -->
                  <div
                    class="priority-badge absolute -top-3 -left-3 w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg border-3 border-white dark:border-gray-800"
                  >
                    {{ index + 1 }}
                  </div>
                </div>
              </div>

              <!-- Details -->
              <div class="flex-1 min-w-0">
                <h3
                  class="text-xl font-bold mb-2 text-gray-800 dark:text-gray-100"
                >
                  {{ wish.item_name }}
                </h3>

                <div
                  class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3"
                >
                  <span
                    v-if="wish.price"
                    class="text-2xl font-bold text-red-700 dark:text-red-400"
                  >
                    ${{ wish.price }}
                  </span>
                  <span
                    class="text-sm text-gray-600 dark:text-gray-300 bg-green-50 dark:bg-green-900 px-3 py-1 rounded-full border border-green-200 dark:border-green-700 w-fit"
                  >
                    {{ getStoreInfo(wish.store || "other").logo }}
                    {{ getStoreInfo(wish.store || "other").name }}
                  </span>
                </div>

                <div class="flex flex-col sm:flex-row gap-2">
                  <UButton
                    v-if="wish.link"
                    label="🔗 View Product"
                    :to="wish.link"
                    target="_blank"
                    variant="outline"
                    size="sm"
                    class="w-full sm:w-auto"
                  />
                  <UButton
                    label="🎅 Mark as Purchased"
                    color="primary"
                    size="sm"
                    class="w-full sm:w-auto"
                    @click="openPurchaseForm(wish)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Purchased Items -->
        <div
          v-if="showPurchased && purchasedItems.length > 0"
          class="mt-8"
        >
          <div
            class="purchased-section bg-gradient-to-r from-green-100 to-red-100 dark:from-gray-900 dark:to-gray-900 rounded-lg shadow-lg p-6 border-4 border-green-400 dark:border-green-800"
          >
            <h2
              class="text-2xl font-bold mb-4 text-green-800 dark:text-green-300 flex items-center gap-2"
            >
              <span class="text-3xl">✅</span>
              Purchased Gifts
              <span class="text-3xl">🎉</span>
            </h2>
            <div class="space-y-4">
              <div
                v-for="wish in purchasedItems"
                :key="wish.id"
                class="purchased-item bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-2 border-green-300 dark:border-green-700"
              >
                <div
                  class="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center"
                >
                  <div class="relative w-full sm:w-20 group">
                    <img
                      v-if="wish.image_url"
                      :src="wish.image_url"
                      :alt="wish.item_name"
                      class="w-full sm:w-20 h-40 sm:h-20 object-cover rounded border-2 border-green-300 dark:border-green-700 cursor-pointer hover:opacity-90 transition-opacity"
                      @click="openImageModal(wish.image_url)"
                    >
                    <div
                      v-else
                      class="w-full sm:w-20 h-40 sm:h-20 bg-green-100 dark:bg-green-900 rounded flex items-center justify-center"
                    >
                      <span class="text-3xl sm:text-2xl">🎁</span>
                    </div>
                    <!-- Expand Icon -->
                    <div
                      v-if="wish.image_url"
                      class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    >
                      <div
                        class="bg-white/90 dark:bg-gray-800/90 rounded-full p-2 shadow-lg flex items-center justify-center w-8 h-8"
                      >
                        <span class="text-gray-700 dark:text-gray-200">⤢</span>
                      </div>
                    </div>
                  </div>

                  <div class="flex-1 w-full">
                    <h3 class="font-bold text-gray-800 dark:text-gray-100">
                      {{ wish.item_name }}
                    </h3>
                    <p class="text-sm text-green-700 dark:text-green-400">
                      🎅 Purchased by {{ wish.purchased_by }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="text-center py-4 md:py-8 text-red-800 dark:text-red-400">
      <p class="text-base md:text-lg font-semibold">
        🎄 Merry Christmas! ❄️ Happy Holidays! 🎁
      </p>
    </footer>

    <!-- Purchase Modal -->
    <UModal v-model:open="showPurchaseForm">
      <template #header>
        <div class="flex items-center gap-2">
          <span class="text-2xl">🎁</span>
          <h2 class="text-xl font-bold text-red-800 dark:text-red-400">
            Mark as Purchased
          </h2>
        </div>
      </template>

      <template #body>
        <div class="space-y-4 p-4">
          <p class="font-bold text-lg text-gray-800 dark:text-gray-100">
            {{ selectedItem?.item_name }}
          </p>

          <form
            class="space-y-4"
            @submit.prevent="markAsPurchased"
          >
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Your Name <span class="text-red-500">*</span></label>
              <UInput
                v-model="purchasingName"
                placeholder="e.g., Mom, Dad, Santa's Helper..."
              />
            </div>

            <div class="flex gap-2 justify-end">
              <UButton
                label="Cancel"
                variant="outline"
                @click="showPurchaseForm = false"
              />
              <UButton
                label="🎅 Confirm Purchase"
                type="submit"
                color="primary"
              />
            </div>
          </form>
        </div>
      </template>
    </UModal>

    <!-- Image Modal -->
    <UModal
      v-model:open="showImageModal"
      class="max-w-5xl"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <span class="text-2xl">🖼️</span>
          <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">
            Image Preview
          </h2>
        </div>
      </template>

      <template #body>
        <div class="p-2">
          <img
            :src="selectedImage"
            alt="Full size preview"
            class="w-full h-auto rounded-lg"
          >
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
/* Stacked photo effect */
:deep(.stacked-photo) {
  will-change: transform, opacity;
}

/* Smooth scroll */
html {
  scroll-behavior: smooth;
}

/* Typewriter cursor blink */
.typewriter-cursor {
  animation: blink 1s step-end infinite;
  margin-left: 2px;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}
</style>
