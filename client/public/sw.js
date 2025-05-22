/**
 * Service Worker for Netflix House Aerial Experience v2
 * Handles caching of videos for offline use
 * 
 * Note: ESLint may warn about 'self' usage but this is standard in service workers
 * as they run in the ServiceWorkerGlobalScope where 'self' refers to the service worker instance
 */

// ESLint configuration to allow service worker globals
/* eslint-disable no-restricted-globals */
/* eslint-env serviceworker */

// Only keep the VIDEO_CACHE - remove CORE_CACHE and API_CACHE
const VIDEO_CACHE = 'nfh-aerial-v2-videos-v1';

// No more CORE_ASSETS to cache

// Install event - minimal setup, no core asset caching
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  // Skip waiting to activate immediately
  self.skipWaiting();
  
  // No core assets to cache
  console.log('[Service Worker] Installed - video-only caching enabled');
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  // Claim clients to control all open pages immediately
  self.clients.claim();
  
  // Cleanup old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Only keep current VIDEO_CACHE, delete everything else
          if (cacheName !== VIDEO_CACHE) {
            console.log('[Service Worker] Deleting cache:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    })
  );
});

// Helper function to determine if a request is for a video
const isVideoRequest = (url) => {
  return (
    url.pathname.endsWith('.mp4') || 
    (url.pathname.includes('/api/assets/file/')) || // Only match actual file endpoints
    url.pathname.includes('/api/videos/file/')
  );
};

// Helper function to add cache headers to a response
const addCacheHeaders = (response, cacheName) => {
  // Create a new response with custom headers
  const headers = new Headers(response.headers);
  headers.append('x-from-sw-cache', 'true');
  headers.append('x-cache-source', 'service-worker');
  headers.append('x-cache-name', cacheName);
  
  // Create a modified response with the new headers
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
};

// Fetch event - only handle video requests, pass everything else through
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle special case for cache detection requests
  if (event.request.method === 'HEAD' && event.request.headers.get('x-cache-check') === 'true') {
    event.respondWith(
      caches.match(new Request(event.request.url, {method: 'GET'}))
        .then(cachedResponse => {
          if (cachedResponse) {
            console.log('[Service Worker] Cache check: HIT for', url.pathname);
            return new Response(null, {
              status: 200,
              headers: {
                'x-from-sw-cache': 'true',
                'x-cache-source': 'service-worker',
                'x-cache-name': VIDEO_CACHE
              }
            });
          } else {
            console.log('[Service Worker] Cache check: MISS for', url.pathname);
            return new Response(null, {
              status: 404,
              headers: {
                'x-from-sw-cache': 'false',
                'x-cache-source': 'network'
              }
            });
          }
        })
        .catch(error => {
          console.error('[Service Worker] Cache check error:', error);
          return new Response(null, {
            status: 500,
            headers: {
              'x-from-sw-cache': 'false',
              'x-cache-source': 'error',
              'x-cache-error': error.message
            }
          });
        })
    );
    return;
  }
  
  // Skip cross-origin requests
  if (url.origin !== self.location.origin && !url.origin.includes('localhost')) {
    return;
  }
  
  // Only handle video requests, pass everything else through
  if (isVideoRequest(url)) {
    // Videos - Cache first, then network
    event.respondWith(
      caches.open(VIDEO_CACHE).then(cache => 
        cache.match(event.request).then(response => {
          // Return cached response if we have it
          if (response) {
            console.log('[Service Worker] Serving video from cache:', url.pathname);
            // Add cache headers to the response
            return addCacheHeaders(response, VIDEO_CACHE);
          }
          
          // Otherwise fetch from network and cache
          console.log('[Service Worker] Fetching video from network:', url.pathname);
          return fetch(event.request).then(networkResponse => {
            // Make a copy of the response to cache
            // Only cache full responses (status 200), not partial content (status 206)
            if (networkResponse.status === 200) {
              const clonedResponse = networkResponse.clone();
              cache.put(event.request, clonedResponse);
              console.log('[Service Worker] Cached video:', url.pathname);
            } else if (networkResponse.status === 206) {
              // Log that we received a partial response that can't be cached
              console.log('[Service Worker] Received partial content (206) that cannot be cached:', url.pathname);
            }
            return networkResponse;
          });
        })
      ).catch(error => {
        console.error('[Service Worker] Video fetch error:', error);
        return new Response('Video not available', { status: 503, statusText: 'Service Unavailable' });
      })
    );
  } 
  // For all non-video requests, just pass through to the network
  // No caching for API or core assets
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Received message:', event.data);
  
  if (!event.data) return;
  
  // Handle get client ID request
  if (event.data.type === 'GET_CLIENT_ID') {
    if (event.source) {
      const requestId = event.data.requestId || 'unknown-request';
      const clientId = event.source.id;
      
      console.log(`[Service Worker] Sending client ID ${clientId} for request ${requestId}`);
      
      // Send the response directly back to the client
      event.source.postMessage({
        type: 'CLIENT_ID_RESPONSE',
        requestId: requestId,
        clientId: clientId
      });
    }
  }
  
  // Handle cache videos request
  else if (event.data.type === 'CACHE_VIDEOS' && event.data.videos) {
    const videos = event.data.videos;
    const clientId = event.data.clientId;
    
    console.log(`[Service Worker] Caching ${videos.length} videos${clientId ? ' for client ' + clientId : ''}`);
    
    // Track progress
    let completedVideos = 0;
    const totalVideos = videos.length;
    
    caches.open(VIDEO_CACHE).then(cache => {
      const fetchPromises = videos.map(video => {
        // Make sure we have a valid URL
        if (!video.url) return Promise.resolve();
        
        return fetch(video.url, {
          // Use a fetch request without range headers to ensure we get a full response
          headers: {
            'Range': '' // Empty range header to prevent partial responses
          }
        })
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to fetch ${video.url}: ${response.status}`);
            }
            
            // Only cache full responses (status 200), not partial content (status 206)
            if (response.status === 206) {
              throw new Error(`Received partial content (206) that cannot be cached for ${video.url}`);
            }
            
            return cache.put(video.url, response);
          })
          .then(() => {
            completedVideos++;
            console.log(`[Service Worker] Cached video: ${video.url} (${completedVideos}/${totalVideos})`);
            
            // Send progress update to the client
            if (clientId) {
              self.clients.get(clientId).then(client => {
                if (client) {
                  client.postMessage({
                    type: 'CACHE_PROGRESS',
                    video: video.id,
                    status: 'completed',
                    completed: completedVideos,
                    total: totalVideos
                  });
                }
              }).catch(err => {
                console.error('[Service Worker] Error sending progress to client:', err);
              });
            } else if (event.source) {
              // Fallback to event.source if clientId not provided
              event.source.postMessage({
                type: 'CACHE_PROGRESS',
                video: video.id,
                status: 'completed',
                completed: completedVideos,
                total: totalVideos
              });
            }
          })
          .catch(error => {
            completedVideos++;
            console.error(`[Service Worker] Failed to cache ${video.url}:`, error);
            
            // Report the error back to the client
            if (clientId) {
              self.clients.get(clientId).then(client => {
                if (client) {
                  client.postMessage({
                    type: 'CACHE_ERROR',
                    video: video.id,
                    error: error.message,
                    completed: completedVideos,
                    total: totalVideos
                  });
                }
              }).catch(err => {
                console.error('[Service Worker] Error sending error to client:', err);
              });
            } else if (event.source) {
              // Fallback to event.source if clientId not provided
              event.source.postMessage({
                type: 'CACHE_ERROR',
                video: video.id,
                error: error.message,
                completed: completedVideos,
                total: totalVideos
              });
            }
          });
      });
      
      return Promise.all(fetchPromises);
    });
  }
  
  // Handle cache version check
  else if (event.data.type === 'CHECK_CACHE_VERSION') {
    const currentVersion = {
      video: VIDEO_CACHE
    };
    
    // Respond to the client
    if (event.source) {
      event.source.postMessage({
        type: 'CACHE_VERSION_INFO',
        version: currentVersion
      });
    }
  }
  
  // Handle cache clearing request
  else if (event.data.type === 'CLEAR_CACHES') {
    console.log('[Service Worker] Clearing all caches');
    
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[Service Worker] All caches cleared');
      // Notify the client
      if (event.source) {
        event.source.postMessage({
          type: 'CACHES_CLEARED'
        });
      }
    });
  }
}); 