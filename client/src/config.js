const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }

  // Default to the current origin if no environment variable is set
  return window.location.origin;
};

export const API_BASE_URL = getApiBaseUrl();
