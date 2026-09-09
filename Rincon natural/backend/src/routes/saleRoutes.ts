import express from 'express'
import { authenticate } from '../middleware/auth'
import * as saleController from '../controllers/saleController'

const router = express.Router()

router.use(authenticate)

router.get('/', saleController.getAll)
router.get('/range', saleController.getByDateRange)
router.post('/', saleController.create)

export default router
