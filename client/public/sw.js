/**
 * Service Worker for Netflix House Aerial Experience v2
 * Handles caching of videos and images for offline use
 * 
 * Note: ESLint may warn about 'self' usage but this is standard in service workers
 * as they run in the ServiceWorkerGlobalScope where 'self' refers to the service worker instance
 */

// ESLint configuration to allow service worker globals
/* eslint-disable no-restricted-globals */
/* eslint-env serviceworker */

// Cache constants
const VIDEO_CACHE = 'nfh-aerial-v2-videos-v1';
const IMAGE_CACHE = 'nfh-aerial-v2-images-v1';

// Install event - minimal setup, no core asset caching
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  // Skip waiting to activate immediately
  self.skipWaiting();
  
  // No core assets to cache
  console.log('[Service Worker] Installed - video and image caching enabled');
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
          // Only keep current VIDEO_CACHE and IMAGE_CACHE, delete everything else
          if (cacheName !== VIDEO_CACHE && cacheName !== IMAGE_CACHE) {
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

// Helper function to determine if a request is for an image
const isImageRequest = (url) => {
  // Match common image file extensions
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const hasImageExtension = imageExtensions.some(ext => url.pathname.toLowerCase().endsWith(ext));
  
  // Match UI element asset API calls (for secondary hotspot images)
  const isUIElementRequest = url.pathname.includes('/api/assets/file/') && 
    (url.searchParams.get('type') === 'UIElement' || url.pathname.includes('UIElement'));
  
  return hasImageExtension || isUIElementRequest;
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

// Fetch event - handle video and image requests, pass everything else through
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle special case for cache detection requests
  if (event.request.method === 'HEAD' && event.request.headers.get('x-cache-check') === 'true') {
    event.respondWith(
      Promise.all([
        caches.match(new Request(event.request.url, {method: 'GET'}), { cacheName: VIDEO_CACHE }),
        caches.match(new Request(event.request.url, {method: 'GET'}), { cacheName: IMAGE_CACHE })
      ]).then(([videoCachedResponse, imageCachedResponse]) => {
        const cachedResponse = videoCachedResponse || imageCachedResponse;
        const cacheSource = videoCachedResponse ? VIDEO_CACHE : (imageCachedResponse ? IMAGE_CACHE : null);
        
        if (cachedResponse) {
          console.log('[Service Worker] Cache check: HIT for', url.pathname);
          return new Response(null, {
            status: 200,
            headers: {
              'x-from-sw-cache': 'true',
              'x-cache-source': 'service-worker',
              'x-cache-name': cacheSource
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
  
  // Handle video requests
  if (isVideoRequest(url)) {
    // Videos - Cache first, then network
    event.respondWith(
      caches.open(VIDEO_CACHE).then(cache => 
        cache.match(event.request).then(response => {
          // Return cached response if we have it
          if (response) {
            console.log('[Service Worker] Serving video from cache:', url.pathname);
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
  // Handle image requests
  else if (isImageRequest(url)) {
    // Images - Cache first, then network
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache => 
        cache.match(event.request).then(response => {
          // Return cached response if we have it
          if (response) {
            console.log('[Service Worker] Serving image from cache:', url.pathname);
            return addCacheHeaders(response, IMAGE_CACHE);
          }
          
          // Otherwise fetch from network and cache
          console.log('[Service Worker] Fetching image from network:', url.pathname);
          return fetch(event.request).then(networkResponse => {
            // Only cache successful responses
            if (networkResponse.status === 200) {
              const clonedResponse = networkResponse.clone();
              cache.put(event.request, clonedResponse);
              console.log('[Service Worker] Cached image:', url.pathname);
            }
            return networkResponse;
          });
        })
      ).catch(error => {
        console.error('[Service Worker] Image fetch error:', error);
        return new Response('Image not available', { status: 503, statusText: 'Service Unavailable' });
      })
    );
  }
  // For all other requests, just pass through to the network
  // No caching for other API or core assets
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
  
  // Handle cache images request
  else if (event.data.type === 'CACHE_IMAGES' && event.data.images) {
    const images = event.data.images;
    const clientId = event.data.clientId;
    
    console.log(`[Service Worker] Caching ${images.length} images${clientId ? ' for client ' + clientId : ''}`);
    
    // Track progress
    let completedImages = 0;
    const totalImages = images.length;
    
    caches.open(IMAGE_CACHE).then(cache => {
      const fetchPromises = images.map(image => {
        // Make sure we have a valid URL
        if (!image.url) return Promise.resolve();
        
        return fetch(image.url)
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to fetch ${image.url}: ${response.status}`);
            }
            
            return cache.put(image.url, response);
          })
          .then(() => {
            completedImages++;
            console.log(`[Service Worker] Cached image: ${image.url} (${completedImages}/${totalImages})`);
            
            // Send progress update to the client
            if (clientId) {
              self.clients.get(clientId).then(client => {
                if (client) {
                  client.postMessage({
                    type: 'IMAGE_CACHE_PROGRESS',
                    image: image.id,
                    status: 'completed',
                    completed: completedImages,
                    total: totalImages
                  });
                }
              }).catch(err => {
                console.error('[Service Worker] Error sending image progress to client:', err);
              });
            } else if (event.source) {
              // Fallback to event.source if clientId not provided
              event.source.postMessage({
                type: 'IMAGE_CACHE_PROGRESS',
                image: image.id,
                status: 'completed',
                completed: completedImages,
                total: totalImages
              });
            }
          })
          .catch(error => {
            completedImages++;
            console.error(`[Service Worker] Failed to cache ${image.url}:`, error);
            
            // Report the error back to the client
            if (clientId) {
              self.clients.get(clientId).then(client => {
                if (client) {
                  client.postMessage({
                    type: 'IMAGE_CACHE_ERROR',
                    image: image.id,
                    error: error.message,
                    completed: completedImages,
                    total: totalImages
                  });
                }
              }).catch(err => {
                console.error('[Service Worker] Error sending image error to client:', err);
              });
            } else if (event.source) {
              // Fallback to event.source if clientId not provided
              event.source.postMessage({
                type: 'IMAGE_CACHE_ERROR',
                image: image.id,
                error: error.message,
                completed: completedImages,
                total: totalImages
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
      video: VIDEO_CACHE,
      image: IMAGE_CACHE
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