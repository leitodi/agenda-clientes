import express from 'express'
import { authenticate } from '../middleware/auth'
import * as employeeController from '../controllers/employeeController'

const router = express.Router()

router.use(authenticate)

router.get('/', employeeController.getAll)
router.get('/:id', employeeController.getById)
router.post('/', employeeController.create)
router.put('/:id', employeeController.update)
router.delete('/:id', employeeController.remove)

export default router
