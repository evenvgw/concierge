import { RequestHandler } from 'express'
import validate from './validate'
import clone from '../git/clone'
import * as db from '../../data'

const handler: RequestHandler = async (req, res) => {
  const { repository, name, key } = req.query

  const body = { repository, name, key }
  const errors = validate(body)

  if (errors.length) {
    const message = errors.join(', ')
    res.status(400).json({ message })
    return
  }

  try {
    const result: number[] = await db.applications()
      .insert(body)
    const id = result[0]

    const app = { ...body, id }

    res.json(app)
    clone(app)
  } catch (ex) {
    res.status(500)
    res.json({ message: ex.message || ex })
  }
}

export default handler