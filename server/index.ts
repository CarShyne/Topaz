import { startSyncServer } from './sync-server'

startSyncServer().then(() => {
  console.log('Topaz sync server running on port 3921')
})
