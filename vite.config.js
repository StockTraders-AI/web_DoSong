import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { handleStockWaveHistory } from './stockWaveHistoryCache.js'
import { handleStockWaveCurrent, startStockWaveCurrentSocket } from './stockWaveCurrentCache.js'
import { handleStockWaveTickers } from './stockWaveTickersCache.js'
import { handleWaveBottomConfirmPairs } from './waveBottomConfirmPairsCache.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'stock-wave-history-cache',
      configureServer(server) {
        startStockWaveCurrentSocket()
        server.middlewares.use((req, res, next) => {
          const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
          if (req.method === 'GET' && url.pathname === '/api/stock-wave-current') {
            handleStockWaveCurrent(req, res)
            return
          }

          if (req.method === 'GET' && url.pathname === '/api/stock-wave-tickers') {
            handleStockWaveTickers(req, res, req.url)
            return
          }

          if (req.method === 'GET' && url.pathname === '/api/wave-bottom-confirm-pairs') {
            handleWaveBottomConfirmPairs(req, res)
            return
          }

          if (req.method === 'GET' && url.pathname === '/api/stock-wave-history') {
            handleStockWaveHistory(req, res, req.url)
            return
          }
          next()
        })
      },
    },
  ],
})