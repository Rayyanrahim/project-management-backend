import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser';

const app = express()

app.use(cors())
app.use(helmet())
app.use(express.json())
app.use(cookieParser())

app.get('/', (req, res) => {
    res.send('API is running...');
});

export default app;
