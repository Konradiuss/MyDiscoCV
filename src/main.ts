import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import { startAnimatedFavicon } from './favicon/animatedFavicon'
import {
  LOADING_MILESTONES,
  reportLoadingProgress,
  startLoadingScreen,
} from './loading/loadingScreen'
import { startFpsOverlay } from './perf/fpsOverlay'
import './assets/main.css'

startLoadingScreen()

void startAnimatedFavicon()

createApp(App).use(router).mount('#app')

// Does nothing at all unless ?fps is in the address.
startFpsOverlay()

reportLoadingProgress(LOADING_MILESTONES.appMounted)
