import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser';
import { errorHandler } from '#middleware/error.middleware.js'

const app = express()
app.use(cors())
app.use(helmet())
app.use(express.json())
app.use(cookieParser())

import authRoutes from '#routes/auth.route.js'

app.use('/api/v1/auth', authRoutes)

app.set('json replacer', (key, value) => typeof value === 'bigint' ? value.toString() : value);
app.use(errorHandler)

export default app;
