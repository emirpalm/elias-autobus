import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5180,
    strictPort: true,
    // inotify no cruza el bind 9P de /mnt/c — hay que hacer polling
    watch: { usePolling: true, interval: 300 },
  },
});
