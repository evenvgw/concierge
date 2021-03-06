<script lang="ts">
import Vue from 'vue'
import { onNavigate, onToast, Toast, toast } from './common'
import { AppState, Container, socket } from './api'
import Containers from './Containers.vue'
import Images from './Images.vue'
import Applications from './Applications.vue'
import Hosts from './Hosts.vue'
import Credentials from './Credentials.vue'
import Config from './Configuration.vue'
import SafeLink from './SafeLink.vue'
import Inspect from './Inspect.vue'
import Logs from './Logs.vue'
import Queue from './Queue.vue'

export interface Toast {
  state: string
  msg: string
  index: number
}

interface NavItem {
  id: string
  title: string
  active: boolean
}

export default Vue.extend({
  props: {
    state: { type: Object as () => AppState }
  },
  components: {
    Containers,
    Images,
    Applications,
    Hosts,
    Credentials,
    Config,
    SafeLink,
    Inspect,
    Logs,
    Queue
  },
  data() {
    return {
      view: 'containers',
      inspectId: '',
      toasts: [] as Toast[],
      navItems: [
        {
          id: 'containers',
          title: 'Containers',
          active: true
        },
        {
          id: 'inspect',
          title: 'Inspect',
          active: false,
          visible: false
        },
        {
          id: 'applications',
          title: 'Applications',
          active: false
        },
        {
          id: 'queue',
          title: 'Builds',
          active: false
        },
        {
          id: 'images',
          title: 'Images',
          active: false
        },
        {
          id: 'hosts',
          title: 'Hosts',
          active: false
        },
        {
          id: 'credentials',
          title: 'Credentials',
          active: false
        },
        {
          id: 'config',
          title: 'Configuration',
          active: false
        },
        {
          id: 'logs',
          title: 'Logs',
          active: false
        }
      ] as NavItem[]
    }
  },
  mounted() {
    onNavigate((path: string) => {
      this.setTab(path)
    })
    this.setTab(window.location.pathname)

    socket.on('toast', (event: ConciergeEvent<string>) => {
      switch (event.type) {
        case 'info':
          toast.primary(event.event)
          break

        case 'warning':
          toast.warn(event.event)
          break

        case 'error':
          toast.error(event.event)
          break

        case 'success':
          toast.success(event.event)
          break
      }
    })

    onToast(toast => {
      this.toasts.push(toast)
      setTimeout(() => {
        const filtered = this.toasts.filter(t => t !== toast)
        this.toasts = filtered
      }, toast.duration)
    })
  },
  computed: {
    inspectContainer: function(): Container | undefined {
      const container = this.state.containers.find(c => c.Id === this.inspectId)
      return container
    }
  },
  methods: {
    setTab(path: string) {
      const splits = path.split('/').filter(p => !!p)
      const resource = (splits[0] || '').toLowerCase()
      const navItem = this.navItems.find(nav => nav.id === resource) || this.navItems[0]
      const view = navItem.id

      if (view === 'inspect') {
        const id = splits[1]
        this.inspectId = id
      }

      this.view = view.replace('/', '')
      for (const item of this.navItems) {
        item.active = view === item.id
      }

      const parts = [view, ...splits.slice(1)]
      window.history.pushState({}, 'Concierge', '/' + parts.join('/'))
    },
    removeToast(index: number) {
      const nextToasts = [...this.toasts.slice(0, index), ...this.toasts.slice(index + 1)]
      this.toasts = nextToasts
    }
  }
})
</script>

<template>
  <div>
    <div class="columns">
      <div class="column col-12">
        <header class="navbar">
          <section class="navbar-section">
            <span style="margin-right: 5px; margin-top: 15px">
              <h5>
                <strong>Concierge</strong>
              </h5>
            </span>
            <ul class="tab" v-for="item in navItems" v-bind:key="item.title">
              <li
                v-if="item.visible !== false"
                class="tab-item"
                v-bind:class="{ active: item.active }"
              >
                <SafeLink
                  v-bind:url="'/' + item.id"
                  v-bind:className="'btn btn-link'"
                >{{item.title}}</SafeLink>
              </li>
            </ul>
          </section>
          <section class="navbar-center"></section>
        </header>
      </div>
    </div>

    <div class="container">
      <Containers v-show="view === 'containers'" v-bind:containers="state.containers"/>
      <Inspect v-if="view ==='inspect'" :container="inspectContainer" :config="state.config"/>
      <Applications
        v-show="view ==='applications'"
        :credentials="state.credentials"
        :applications="state.applications"
        :images="state.images"
        :remotes="state.remotes"
        :containers="state.containers"
      />
      <Queue v-show="view === 'queue'" :queue="state.queue"/>
      <Images v-show="view ==='images'" :images="state.images" :containers="state.containers"/>
      <Hosts v-show="view ==='hosts'" :hosts="state.hosts" :credentials="state.credentials"/>
      <Credentials v-show="view ==='credentials' " :credentials="state.credentials "/>
      <Config v-show="view ==='config'" :config="state.config" :credentials="state.credentials"/>
      <Logs v-show="view === 'logs'" :monitors="state.monitors"/>
    </div>

    <div v-for="(toast, i) in toasts" :key="i">
      <div style="position: fixed; bottom: 20px; right: 50px">
        <div class="toast" :class="toast.type">
          <button class="btn btn-clear float-right" v-on:click="removeToast(i)"></button>
          <span>{{ toast.msg }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

