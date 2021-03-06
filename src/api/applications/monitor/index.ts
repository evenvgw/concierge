import * as db from '../db'
import { RemoteMonitor } from './monitor'
import { getConfig } from '../../configuration/db'

export default async function monitorAll() {
  await monitor.init()
}

class MonitorAll {
  monitors: RemoteMonitor[] = []
  initialised = false

  constructor() {}

  init = async () => {
    const applications = await db.all()
    this.monitors = applications.map(app => new RemoteMonitor(app))

    const promises = this.monitors.map(monitor => monitor.initialise(false))
    await Promise.all(promises)
    this.initialised = true

    const { gitPollingIntervalSecs } = await getConfig()
    setTimeout(() => this.poll(), gitPollingIntervalSecs * 1000)
  }

  poll = async () => {
    try {
      const apps = await db.all()
      for (const app of apps) {
        const monitor = this.monitors.find(monitor => monitor.app.id === app.id)
        if (monitor) {
          continue
        }

        const monitoredApp = new RemoteMonitor(app)
        await monitoredApp.initialise(true)
        this.monitors.push(monitoredApp)
      }
    } catch {
      /** Intentional NOOP */
    }
  }
}

const monitor = new MonitorAll()

export function poll() {
  return monitor.poll()
}
