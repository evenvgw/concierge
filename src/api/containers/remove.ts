import { RequestHandler } from 'express'
import * as getHosts from '../hosts/db'
import docker from '../docker'

const handler: RequestHandler = async (req, res) => {
  const containerId = req.params.id
  const hostId = req.params.hostid

  const host = await getHosts.getOne(hostId)
  if (!host) {
    return res
      .status(400)
      .json({
        status: 400,
        message: 'Invalid Host ID'
      })
  }

  const client = docker(host)
  try {
    const container = client.getContainer(containerId)
    await container.stop()
    await container.remove()
    return res.json({ message: 'Removed OK' })
  } catch (ex) {
    return res
      .status(500)
      .json(ex)
  }
}

export default handler