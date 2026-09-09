import express from 'express'
import authRoutes from './authRoutes'
import productRoutes from './productRoutes'
import employeeRoutes from './employeeRoutes'
import providerRoutes from './providerRoutes'
import saleRoutes from './saleRoutes'

const router = express.Router()

router.use('/auth', authRoutes)
router.use('/products', productRoutes)
router.use('/employees', employeeRoutes)
router.use('/providers', providerRoutes)
router.use('/sales', saleRoutes)

export default router
