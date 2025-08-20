import axios from 'axios'
import logger from './logger'

export interface HttpError { status?: number; code?: string; message: string; data?: any }

const httpClient = axios.create({
  timeout: Number(process.env.HTTP_CLIENT_TIMEOUT_MS || 10000),
})

httpClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response) {
      const err: HttpError = { status: error.response.status, message: String(error.response.data || error.message), data: error.response.data }
      logger.error({ err }, 'HTTP response error')
      return Promise.reject(err)
    }
    if (error.request) {
      const err: HttpError = { message: 'No response received', data: null }
      logger.error({ err }, 'HTTP no response')
      return Promise.reject(err)
    }
    const err: HttpError = { message: error.message }
    logger.error({ err }, 'HTTP setup error')
    return Promise.reject(err)
  }
)

export default httpClient


