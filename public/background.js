chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background script received message:", message);

  if (message.action === "startAutofill") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        console.log("Sending message to content script...");
        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error sending message to content script:",
              chrome.runtime.lastError
            );
            sendResponse({
              error: "Failed to communicate with content script",
            });
          } else {
            console.log("Response from content script:", response);
            sendResponse(response);
          }
        });

        return true;
      } else {
        console.warn("No active tab found.");
        sendResponse({ error: "No active tab" });
      }
    });

    return true;
  }
});
