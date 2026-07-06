chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['projectId'], (items) => {
    if (!items.projectId) {
      chrome.storage.sync.set({ projectId: '' });
    }
  });
});
