import dotenv from 'dotenv'
import { connectToDatabase } from '../config/db'
import { ensureSeedData } from '../utils/seed'

dotenv.config()

async function run() {
  try {
    await connectToDatabase()
    await ensureSeedData()
    console.log('Seed completado correctamente.')
    process.exit(0)
  } catch (error) {
    console.error('Error al ejecutar el seed:', error)
    process.exit(1)
  }
}

void run()
