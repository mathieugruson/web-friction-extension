// Initialize the extension
console.log("Dynamic Redirect Extension Initialized");

// Helper to update rules dynamically
async function updateRules(blockedUrls) {
  console.log("Updating rules with blocked URLs:", blockedUrls);

  // Get existing rules and remove them to avoid duplicates
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingRuleIds = existingRules.map((rule) => rule.id);

  if (existingRuleIds.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: existingRuleIds });
  }

  // Create and add new rules for each blocked URL
  const rules = blockedUrls.map((url, index) => ({
    id: index + 1, // Unique ID for each rule
    priority: 1,
    action: {
      type: "redirect",
      redirect: { url: "https://www.google.com" }
    },
    condition: {
      urlFilter: url,
      resourceTypes: ["main_frame"]
    }
  }));

  if (rules.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({ addRules: rules });
    console.log("Rules updated successfully!");
  } else {
    console.log("No URLs provided to block.");
  }
}

// Load initial blocked URLs from storage
chrome.storage.sync.get(["blockedUrls"], (data) => {
  const blockedUrls = data.blockedUrls || [];
  console.log("Loaded initial blocked URLs:", blockedUrls);
  updateRules(blockedUrls);
});

// Listen for runtime messages (e.g., from the popup)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "updateBlockedUrls") {
    const blockedUrls = message.blockedUrls;
    console.log("Received new blocked URLs:", blockedUrls);

    // Save the updated URLs to storage
    chrome.storage.sync.set({ blockedUrls }, () => {
      console.log("Blocked URLs saved to storage:", blockedUrls);

      // Update the rules dynamically
      updateRules(blockedUrls).then(() => {
        sendResponse({ status: "success", updatedUrls: blockedUrls });
      }).catch((error) => {
        console.error("Failed to update rules:", error);
        sendResponse({ status: "error", error: error.message });
      });
    });

    // Return true to indicate that the response will be sent asynchronously
    return true;
  }
});
