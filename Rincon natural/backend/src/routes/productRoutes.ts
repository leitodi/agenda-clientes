import express from 'express'
import { authenticate } from '../middleware/auth'
import * as productController from '../controllers/productController'

const router = express.Router()

router.use(authenticate)

router.get('/', productController.getAll)
router.get('/:id', productController.getById)
router.post('/', productController.create)
router.put('/:id', productController.update)
router.delete('/:id', productController.remove)

export default router
