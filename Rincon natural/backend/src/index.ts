import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'node:path'
import routes from './routes/index'
import { connectToDatabase, getDatabaseStatus } from './config/db'
import { ensureSeedData } from './utils/seed'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist')
const frontendIndexPath = path.join(frontendDistPath, 'index.html')

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    status: 'OK',
    message: 'Servidor funcionando',
    timestamp: new Date().toISOString(),
    ...getDatabaseStatus(),
  })
})

app.use('/api', routes)

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(frontendDistPath))

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next()
    }

    return res.sendFile(frontendIndexPath)
  })
}

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Algo salio mal' })
})

async function startServer() {
  try {
    await connectToDatabase()
    await ensureSeedData()

    app.listen(PORT, () => {
      console.log(`Servidor ejecutandose en puerto ${PORT}`)
    })
  } catch (error) {
    console.error('Error al iniciar servidor:', error)
    process.exit(1)
  }
}

void startServer()
