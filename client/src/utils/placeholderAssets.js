// client/src/utils/placeholderAssets.js - Utility for generating placeholder UI assets

import api from './api';

// Generate a data URL for a placeholder image
const generatePlaceholderImage = (width, height, text, bgColor = '#1a1a1a', textColor = '#ffffff') => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Draw background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Draw border
  ctx.strokeStyle = textColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  // Draw text
  ctx.fillStyle = textColor;
  ctx.font = `${Math.min(width, height) / 8}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  return canvas.toDataURL('image/png');
};

// Generate placeholder assets for different UI elements
export const generatePlaceholderAssets = () => {
  const assets = {
    // Navigation buttons (128x64px)
    buttons: {
      'dallas': generatePlaceholderImage(128, 64, 'Dallas', '#1a1a1a', '#ffffff'),
      'philly': generatePlaceholderImage(128, 64, 'Philly', '#1a1a1a', '#ffffff'),
      'kop': generatePlaceholderImage(128, 64, 'KOP', '#1a1a1a', '#ffffff')
    },
    
    // Map pins (32x48px)
    pins: {
      'primary': generatePlaceholderImage(32, 48, '★', '#e50914', '#ffffff'), // Netflix red
      'secondary': generatePlaceholderImage(32, 48, '●', '#ffffff', '#1a1a1a') // White
    },
    
    // UI elements
    ui: {
      'back': generatePlaceholderImage(48, 48, '←', '#1a1a1a', '#ffffff'),
      'menu': generatePlaceholderImage(48, 48, '☰', '#1a1a1a', '#ffffff'),
      'close': generatePlaceholderImage(48, 48, '×', '#1a1a1a', '#ffffff'),
      'loading': generatePlaceholderImage(64, 64, '⌛', '#1a1a1a', '#ffffff'),
      'error': generatePlaceholderImage(64, 64, '!', '#e50914', '#ffffff')
    }
  };

  return assets;
};

// Convert data URL to Blob
const dataURLtoBlob = (dataURL) => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

// Create File objects from placeholder assets
export const createPlaceholderFiles = () => {
  const assets = generatePlaceholderAssets();
  const files = {};

  // Create button files
  Object.entries(assets.buttons).forEach(([name, dataUrl]) => {
    const blob = dataURLtoBlob(dataUrl);
    files[`button_${name}.png`] = new File([blob], `button_${name}.png`, { type: 'image/png' });
  });

  // Create pin files
  Object.entries(assets.pins).forEach(([type, dataUrl]) => {
    const blob = dataURLtoBlob(dataUrl);
    files[`pin_${type}.png`] = new File([blob], `pin_${type}.png`, { type: 'image/png' });
  });

  // Create UI element files
  Object.entries(assets.ui).forEach(([name, dataUrl]) => {
    const blob = dataURLtoBlob(dataUrl);
    files[`ui_${name}.png`] = new File([blob], `ui_${name}.png`, { type: 'image/png' });
  });

  return files;
};

// Upload placeholder assets to the server
export const uploadPlaceholderAssets = async () => {
  const files = createPlaceholderFiles();
  const uploadPromises = [];

  // Upload buttons
  Object.entries(files).forEach(([filename, file]) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', filename.startsWith('button_') ? 'Button' : 
                           filename.startsWith('pin_') ? 'Pin' : 'UI');
    formData.append('name', filename.replace(/\.[^/.]+$/, '')); // Remove extension
    
    uploadPromises.push(
      api.createAsset(formData)
        .then(response => {
          console.log(`Uploaded ${filename}:`, response.data);
          return response.data;
        })
        .catch(error => {
          console.error(`Error uploading ${filename}:`, error);
          return null;
        })
    );
  });

  return Promise.all(uploadPromises);
};

export default {
  generatePlaceholderAssets,
  createPlaceholderFiles
}; 