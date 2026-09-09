import express from 'express'
import { authenticate } from '../middleware/auth'
import * as providerController from '../controllers/providerController'

const router = express.Router()

router.use(authenticate)

router.get('/', providerController.getAll)
router.get('/:id', providerController.getById)
router.post('/', providerController.create)
router.put('/:id', providerController.update)
router.delete('/:id', providerController.remove)

export default router
