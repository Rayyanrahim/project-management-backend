import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser';
import { errorHandler } from '#middleware/error.middleware.js'

const app = express()
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
})
)
app.use(helmet())
app.use(express.json())
app.use(cookieParser())

import authRoutes from '#routes/auth.route.js'
import workspaceRoutes from '#routes/workspace.route.js'
import companyRoutes from '#routes/company.route.js'

app.use('/api/v1/workspace', workspaceRoutes)
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/company', companyRoutes)

app.set('json replacer', (key, value) => typeof value === 'bigint' ? value.toString() : value);
app.use(errorHandler)

export default app;
