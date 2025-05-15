// client/src/utils/s3.js - Utility for frontend S3 operations

import axios from 'axios';
import api from './api';

/**
 * Utility class for handling S3 operations from the frontend
 */
class S3Util {
  /**
   * Get a signed URL for an S3 asset
   * @param {string} s3Key - The S3 key of the asset
   * @returns {Promise<string>} - The signed URL
   */
  async getSignedUrl(s3Key) {
    try {
      const response = await api.getSignedUrl(s3Key);
      return response.data.url;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      throw error;
    }
  }

  /**
   * Upload a file directly to S3 (if needed)
   * @param {File} file - The file to upload
   * @param {string} path - Path within the bucket
   * @returns {Promise<string>} - The S3 URL of the uploaded file
   */
  async uploadFile(file, path = '') {
    try {
      // Create a pre-signed URL for the upload
      const response = await api.getS3UploadUrl({
        fileName: file.name,
        fileType: file.type,
        path
      });
      
      const { url, fields, key } = response.data;
      
      // Create form data with required fields for S3
      const formData = new FormData();
      Object.entries(fields).forEach(([fieldName, fieldValue]) => {
        formData.append(fieldName, fieldValue);
      });
      
      // Add the file as the last field
      formData.append('file', file);
      
      // Upload directly to S3 using the pre-signed URL
      await axios.post(url, formData);
      
      // Return the S3 key of the uploaded file
      return key;
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw error;
    }
  }

  /**
   * Get the direct URL for an S3 asset
   * @param {string} s3Key - The S3 key of the asset
   * @returns {string} - The direct URL
   */
  getDirectUrl(s3Key) {
    // This function assumes public read access is enabled for the S3 bucket
    if (!s3Key) return '';
    
    // If the key already contains the full URL, return it
    if (s3Key.startsWith('http')) {
      return s3Key;
    }
    
    // Construct URL based on S3 bucket and region
    // This is a placeholder - you should get the actual bucket name and region from config
    const bucketName = process.env.REACT_APP_S3_BUCKET_NAME || 'netflix-house-assets';
    const region = process.env.REACT_APP_AWS_REGION || 'us-east-1';
    
    return `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
  }

  /**
   * Get a public URL for an S3 asset based on the configuration
   * @param {string} s3Key - The S3 key of the asset
   * @param {boolean} signed - Whether to use a signed URL
   * @returns {Promise<string>} - The URL to the asset
   */
  async getAssetUrl(s3Key, signed = false) {
    if (!s3Key) return '';
    
    if (signed) {
      return this.getSignedUrl(s3Key);
    } else {
      return this.getDirectUrl(s3Key);
    }
  }
}

export default new S3Util();
