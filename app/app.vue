<script setup lang="ts">
const route = useRoute()
const writerPortal = computed(() => route.path.startsWith('/writer/'))
const portalChosen = ref(route.path !== '/')
const portalDialog = ref<HTMLDialogElement | null>(null)

onMounted(() => {
  if (!portalChosen.value) portalDialog.value?.showModal()
})

async function choosePortal(portal: 'public' | 'writer') {
  portalChosen.value = true
  portalDialog.value?.close()
  if (portal === 'writer') await navigateTo('/writer/articles')
}
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <header class="site-header">
      <div class="header-content">
        <NuxtLink to="/" class="brand"><span class="brand-mark" aria-hidden="true">N</span>Northbeam Docs Studio</NuxtLink>
        <nav class="portal-switch" aria-label="Switch portal">
          <NuxtLink to="/" :aria-current="!writerPortal ? 'page' : undefined" :class="{ selected: !writerPortal }">Public</NuxtLink>
          <NuxtLink to="/writer/articles" :aria-current="writerPortal ? 'page' : undefined" :class="{ selected: writerPortal }">Writer</NuxtLink>
        </nav>
      </div>
    </header>
    <main v-show="portalChosen" class="page-content"><NuxtPage /></main>
    <dialog ref="portalDialog" class="portal-dialog" aria-labelledby="portal-dialog-title" aria-describedby="portal-dialog-description" @cancel="choosePortal('public')">
      <p class="eyebrow">Northbeam Docs Studio</p>
      <h2 id="portal-dialog-title">Where would you like to go?</h2>
      <p id="portal-dialog-description" class="muted">Choose a side to get started. You can switch at any time using the header.</p>
      <div class="portal-choices">
        <button type="button" class="portal-choice" autofocus @click="choosePortal('public')"><strong>Public · Read articles →</strong><span>Explore articles published by our writers.</span></button>
        <button type="button" class="portal-choice" @click="choosePortal('writer')"><strong>Writer · Manage articles →</strong><span>Create drafts and open your article workspace.</span></button>
      </div>
    </dialog>
  </div>
</template>
