import * as io from 'socket.io-client'
import { ContainerInfo, ImageInfo } from 'dockerode'

export { State } from '../src/api/applications/types'

export interface Container extends ContainerInfo {
  stats: Stats
  concierge: {
    hostId: number
    host: {
      id: number
      hostname: string
      capacity: number
      dockerPort: number
      vanityHostname: string
    }
  }
}

export interface Image extends ImageInfo {
  name: string
  concierge: {
    hostId: number
    host: {
      id: number
      hostname: string
      capacity: number
      dockerPort: number
      vanityHostname: string
    }
  }
}

export type Monitor = {
  id: string
  logs: string[]
}

export type Host = Schema.Host
export type Credential = Schema.Credentials
export type Configuration = Concierge.Configuration
export type Application = Concierge.ApplicationDTO
export type Remote = Schema.ApplicationRemote
export type QueueItem = Concierge.QueueItem
export type Queue = { progress: QueueItem[]; done: QueueItem[] }

export const socket = io() as SocketIOClient.Socket

export type Stats = {
  memory: string
  cpu: string
  mbIn: string
  mbOut: string
}

export interface AppState {
  containers: Container[]
  images: Image[]
  hosts: Host[]
  credentials: Credential[]
  applications: Application[]
  remotes: Remote[]
  config: Configuration
  monitors: Monitor[]
  queue: Queue
}

export async function getAll(state: AppState): Promise<AppState> {
  const containers = await getContainers(state.containers)
  const hosts = await getHosts(state.hosts)
  const images = await getImages(state.images)
  const credentials = await getCredentials(state.credentials)
  const applications = await getApplications(state.applications)
  const remotes = await getApplicationRemotes(state.remotes)
  const config = await getConfig()
  const queue = await getQueue()

  return {
    containers,
    hosts,
    images,
    credentials,
    applications,
    remotes,
    config,
    queue,
    monitors: []
  }
}

export async function getDockerResources(state: AppState): Promise<AppState> {
  const containers = await getContainers(state.containers)
  const images = await getImages(state.images)

  return {
    ...state,
    containers,
    images
  }
}

export async function getContainers(from: Container[]) {
  const to = await get<Container[]>('/api/hosts/containers')
  for (const left of from) {
    const right = to.find(t => t.Id === left.Id)
    if (!right) {
      continue
    }

    left.State = right.State
    left.Status = right.Status
  }

  const existingStats = (container: Container) => {
    const existing = from.find(ex => ex.Id === container.Id)
    return existing ? existing.stats : {}
  }

  const mapped = to.map(container => ({
    ...container,
    Image:
      container.Image.indexOf('sha256:') === 0
        ? container.Image.slice(0, 17) + '...'
        : container.Image,
    stats: {
      mbIn: 'N/A',
      mbOut: 'N/A',
      cpu: '0%',
      memory: '0%',
      ...existingStats(container)
    }
  }))

  const merged = merge(from, mapped, 'Id')
  merged.sort((l, r) => (l.Status > r.Status ? -1 : l.Status === r.Status ? 0 : 1))
  return merged
}

export async function getImages(from: Image[]) {
  const to = await get<Image[]>('/api/images')
  for (const img of to) {
    const name = getTag(img.RepoTags || [])
    img.name = name
  }
  return merge(from, to.filter(t => t.name !== '<unknown>'), 'Id')
}

function getTag(tags: string[]) {
  const tag = tags.find(tag => tag !== '<none>:<none>')
  return tag || '<unknown>'
}

export async function getHosts(from: Schema.Host[]) {
  const to = await get<Schema.Host[]>('/api/hosts')
  return merge(from, to, 'id')
}

export async function getCredentials(from: Schema.Credentials[]) {
  const to = await get<Schema.Credentials[]>('/api/credentials')
  return merge(from, to, 'id')
}

export async function getApplications(from: Concierge.ApplicationDTO[]) {
  const to = await get<Concierge.ApplicationDTO[]>('/api/applications')
  return merge(from, to, 'id')
}

export async function getApplicationRemotes(from: Remote[]) {
  const to = await get<Remote[]>('/api/applications/branches?active')
  return merge(from, to, 'id')
}

export async function getConfig() {
  return get<Concierge.Configuration>('/api/configuration')
}

export async function getQueue() {
  const res = await fetch('/api/queue')
  const json: Queue = await res.json()
  return json
}

export async function getLogFile(appId: number, file: string) {
  const log = await get<Concierge.LogFile>(`/api/applications/${appId}/logs/${file}`)
  return log
}

function get<T>(path: string) {
  return fetch(path).then(res => res.json()) as Promise<T>
}

function merge<T>(fromList: T[], toList: T[], idKey: keyof T) {
  const seen = new Set<any>()
  for (const to of toList) {
    seen.add(to[idKey])

    const original = fromList.find(from => from[idKey] === to[idKey])
    if (original) {
      for (const key of Object.keys(original) as Array<keyof typeof original>) {
        if (key === idKey) continue
        original[key] = to[key]
      }
      continue
    }

    fromList.push(to)
  }

  // Remove unseen items as they're most likely deleted
  const seenList = fromList.filter(from => seen.has(from[idKey]))
  return seenList
}
